// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title IERC4626 - Minimal interface for ERC4626 vaults (Morpho MetaMorpho)
 */
interface IERC4626 {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function maxWithdraw(address owner) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function asset() external view returns (address);
}

/**
 * @title VaadaV4
 * @notice Shared goal pools with entry windows, stake-weighted payouts, and 10% platform fee
 * @dev Entry Phase → Competition Phase → Settlement
 *      - Entry phase: users can join (and start competing)
 *      - Competition phase: no new entries, just complete the goal
 *      - Settlement: verify results, distribute payouts
 *      - Yield: Stakes earn yield via Morpho (Gauntlet USDC Prime vault)
 */
contract VaadaV4 {
    // ============ Reentrancy Guard ============
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _reentrancyStatus = NOT_ENTERED;
    
    modifier nonReentrant() {
        require(_reentrancyStatus != ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = ENTERED;
        _;
        _reentrancyStatus = NOT_ENTERED;
    }
    
    // ============ Pausable ============
    bool private _paused;
    
    event Paused(address account);
    event Unpaused(address account);
    
    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }
    
    function paused() public view returns (bool) {
        return _paused;
    }
    
    // ============ Enums ============
    
    // Goal types determine which tracker and metric to use
    // STRAVA_MILES: Requires Strava, target is miles (1e18 = 1 mile)
    // FITBIT_STEPS: Requires Fitbit, target is steps (1e18 = 1 step)
    enum GoalType { STRAVA_MILES, FITBIT_STEPS }
    
    // ============ Structs ============
    
    struct Goal {
        uint256 id;
        string name;              // e.g., "Daily Mile" or "10K Steps"
        uint256 target;           // Target in wei (1e18 = 1 mile or 1 step depending on goalType)
        uint256 minStake;         // Minimum stake to join
        uint256 maxStake;         // Maximum stake to join
        uint256 startTime;        // When goal starts (activities before don't count)
        uint256 entryDeadline;    // Can't join after this time
        uint256 deadline;         // When competition ends
        bool active;              // Is goal accepting entries?
        bool settled;             // Has this goal been settled?
        uint256 totalStaked;      // Sum of all stakes
        uint256 participantCount;
    }
    
    struct Participant {
        address user;
        uint256 stake;
        uint256 actualValue;      // Verified value from oracle (miles or steps depending on goalType)
        bool verified;            // Has oracle reported?
        bool succeeded;           // Did they hit target?
        bool claimed;             // Have they claimed payout?
    }

    // ============ State ============
    
    IERC20 public immutable usdc;
    IERC4626 public immutable vault;  // Morpho vault (Gauntlet USDC Prime)
    address public oracle;
    address public owner;
    address public treasury;
    
    uint256 public goalCount;
    uint256 public constant CLAIM_WINDOW = 30 days;
    uint256 public platformFeeBps = 1000; // 10% = 1000 basis points
    
    // Track total USDC owed to participants (principal only, no yield)
    uint256 public totalActiveStakes;
    
    // Goal ID => Goal
    mapping(uint256 => Goal) public goals;
    
    // Goal ID => GoalType (stored separately to avoid stack-too-deep)
    mapping(uint256 => GoalType) public goalTypes;
    
    // Goal ID => participant address => Participant
    mapping(uint256 => mapping(address => Participant)) public participants;
    
    // Goal ID => list of participant addresses
    mapping(uint256 => address[]) public goalParticipants;
    
    // User => list of goal IDs they've joined
    mapping(address => uint256[]) public userGoals;
    
    // Goal ID => settlement data (calculated once during settle)
    mapping(uint256 => uint256) public totalWinnerStakes;
    mapping(uint256 => uint256) public loserPool;
    mapping(uint256 => uint256) public totalClaimed;  // Track claimed amounts per goal
    mapping(uint256 => bool) public swept;  // Has unclaimed funds been swept?
    
    // ============ Events ============
    
    event GoalCreated(
        uint256 indexed goalId,
        string name,
        GoalType goalType,
        uint256 target,
        uint256 minStake,
        uint256 maxStake,
        uint256 startTime,
        uint256 entryDeadline,
        uint256 deadline
    );
    
    event GoalJoined(
        uint256 indexed goalId,
        address indexed user,
        uint256 stake
    );
    
    event ParticipantVerified(
        uint256 indexed goalId,
        address indexed user,
        uint256 actualValue,
        bool succeeded
    );
    
    event GoalSettled(
        uint256 indexed goalId,
        uint256 totalWinnerStakes,
        uint256 loserPool,
        uint256 winnerCount,
        uint256 loserCount
    );
    
    event PayoutClaimed(
        uint256 indexed goalId,
        address indexed user,
        uint256 stakeReturned,
        uint256 bonus,
        uint256 totalPayout
    );
    
    event UnclaimedSwept(
        uint256 indexed goalId,
        uint256 amount,
        address treasury
    );
    
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    
    event GoalCancelled(uint256 indexed goalId, uint256 participantsRefunded);
    
    event GoalUpdated(
        uint256 indexed goalId,
        string name,
        uint256 target,
        uint256 minStake,
        uint256 maxStake,
        uint256 entryDeadline,
        uint256 deadline
    );
    
    event PlatformFeeTaken(uint256 indexed goalId, uint256 feeAmount, address treasury);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event YieldClaimed(uint256 amount, address treasury);
    
    event DepositedToVault(uint256 assets, uint256 shares);
    
    event WithdrawnFromVault(uint256 assets, uint256 shares);
    
    // ============ Errors ============
    
    error NotOwner();
    error NotOracle();
    error GoalNotActive();
    error GoalNotSettled();
    error EntryClosed();           // Entry phase has ended
    error AlreadyJoined();
    error StakeTooLow();
    error StakeTooHigh();
    error DeadlineNotReached();
    error AlreadyVerified();
    error AlreadyClaimed();
    error NotParticipant();
    error NotAllVerified();
    error DidNotSucceed();
    error ClaimWindowOpen();
    error AlreadySwept();
    error NoYieldAvailable();
    error WithdrawFailed();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _usdc, address _vault, address _oracle, address _treasury) {
        usdc = IERC20(_usdc);
        vault = IERC4626(_vault);
        oracle = _oracle;
        treasury = _treasury;
        owner = msg.sender;
        
        // Approve vault to spend USDC (max approval for gas efficiency)
        IERC20(_usdc).approve(_vault, type(uint256).max);
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Join a goal with a stake (only during entry phase)
     * @param goalId The goal to join
     * @param stake Amount of USDC to stake
     */
    function joinGoal(uint256 goalId, uint256 stake) external nonReentrant whenNotPaused {
        Goal storage goal = goals[goalId];
        
        if (!goal.active) revert GoalNotActive();
        if (block.timestamp > goal.entryDeadline) revert EntryClosed();
        if (participants[goalId][msg.sender].stake > 0) revert AlreadyJoined();
        if (stake < goal.minStake) revert StakeTooLow();
        if (stake > goal.maxStake) revert StakeTooHigh();
        
        // Transfer USDC from user to this contract
        require(usdc.transferFrom(msg.sender, address(this), stake), "Transfer failed");
        
        // Deposit USDC to Morpho vault for yield
        uint256 shares = vault.deposit(stake, address(this));
        emit DepositedToVault(stake, shares);
        
        // Track active stakes
        totalActiveStakes += stake;
        
        // Record participation
        participants[goalId][msg.sender] = Participant({
            user: msg.sender,
            stake: stake,
            actualValue: 0,
            verified: false,
            succeeded: false,
            claimed: false
        });
        
        goalParticipants[goalId].push(msg.sender);
        userGoals[msg.sender].push(goalId);
        
        goal.totalStaked += stake;
        goal.participantCount++;
        
        emit GoalJoined(goalId, msg.sender, stake);
    }
    
    /**
     * @notice Claim payout after goal is settled (winners only)
     * @param goalId The goal to claim from
     */
    function claimPayout(uint256 goalId) external nonReentrant {
        Goal storage goal = goals[goalId];
        Participant storage p = participants[goalId][msg.sender];
        
        if (!goal.settled) revert GoalNotSettled();
        if (p.stake == 0) revert NotParticipant();
        if (p.claimed) revert AlreadyClaimed();
        if (!p.succeeded) revert DidNotSucceed();
        
        p.claimed = true;
        
        // Calculate payout: stake + proportional bonus
        uint256 bonus = 0;
        if (totalWinnerStakes[goalId] > 0 && loserPool[goalId] > 0) {
            bonus = (p.stake * loserPool[goalId]) / totalWinnerStakes[goalId];
        }
        
        uint256 totalPayout = p.stake + bonus;
        totalClaimed[goalId] += totalPayout;
        
        // Reduce active stakes tracking
        totalActiveStakes -= totalPayout;
        
        // Withdraw from Morpho vault
        uint256 shares = vault.withdraw(totalPayout, msg.sender, address(this));
        emit WithdrawnFromVault(totalPayout, shares);
        
        emit PayoutClaimed(goalId, msg.sender, p.stake, bonus, totalPayout);
    }
    
    // ============ Oracle Functions ============
    
    /**
     * @notice Verify a participant's result (called by oracle)
     * @param goalId The goal
     * @param user The participant
     * @param actualValue Value verified from tracker (miles or steps depending on goalType)
     */
    function verifyParticipant(
        uint256 goalId,
        address user,
        uint256 actualValue
    ) external onlyOracle {
        Goal storage goal = goals[goalId];
        Participant storage p = participants[goalId][user];
        
        if (block.timestamp < goal.deadline) revert DeadlineNotReached();
        if (p.stake == 0) revert NotParticipant();
        if (p.verified) revert AlreadyVerified();
        
        p.verified = true;
        p.actualValue = actualValue;
        p.succeeded = actualValue >= goal.target;
        
        emit ParticipantVerified(goalId, user, actualValue, p.succeeded);
    }
    
    /**
     * @notice Settle a goal after all participants are verified
     * @param goalId The goal to settle
     */
    function settleGoal(uint256 goalId) external onlyOracle {
        Goal storage goal = goals[goalId];
        
        if (goal.settled) revert GoalNotSettled();
        if (block.timestamp < goal.deadline) revert DeadlineNotReached();
        
        // Check all participants are verified
        address[] storage addrs = goalParticipants[goalId];
        uint256 winnerStakes = 0;
        uint256 loserStakes = 0;
        uint256 winnerCount = 0;
        uint256 loserCount = 0;
        
        for (uint256 i = 0; i < addrs.length; i++) {
            Participant storage p = participants[goalId][addrs[i]];
            if (!p.verified) revert NotAllVerified();
            
            if (p.succeeded) {
                winnerStakes += p.stake;
                winnerCount++;
            } else {
                loserStakes += p.stake;
                loserCount++;
            }
        }
        
        // Take platform fee from loser pool
        uint256 platformFee = 0;
        if (loserStakes > 0) {
            platformFee = (loserStakes * platformFeeBps) / 10000;
            loserStakes -= platformFee;
            
            // Reduce active stakes by fee amount (it's leaving the pool)
            totalActiveStakes -= platformFee;
            
            // Withdraw fee from vault to treasury
            uint256 feeShares = vault.withdraw(platformFee, treasury, address(this));
            emit WithdrawnFromVault(platformFee, feeShares);
            emit PlatformFeeTaken(goalId, platformFee, treasury);
        }
        
        goal.settled = true;
        goal.active = false;
        totalWinnerStakes[goalId] = winnerStakes;
        loserPool[goalId] = loserStakes; // 90% of original loser stakes
        
        emit GoalSettled(goalId, winnerStakes, loserStakes, winnerCount, loserCount);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Create a new goal with entry window
     * @param name Goal name
     * @param goalType Type of goal (STRAVA_MILES or FITBIT_STEPS)
     * @param target Target value in wei (1e18 = 1 mile or 1 step depending on goalType)
     * @param minStake Minimum USDC stake
     * @param maxStake Maximum USDC stake
     * @param startTime When activities start counting
     * @param entryDeadline When entry phase closes (must be >= startTime and <= deadline)
     * @param deadline When competition ends
     */
    function createGoal(
        string calldata name,
        GoalType goalType,
        uint256 target,
        uint256 minStake,
        uint256 maxStake,
        uint256 startTime,
        uint256 entryDeadline,
        uint256 deadline
    ) external onlyOwner returns (uint256 goalId) {
        require(deadline > startTime, "Invalid: deadline <= startTime");
        require(entryDeadline >= startTime, "Invalid: entryDeadline < startTime");
        require(entryDeadline <= deadline, "Invalid: entryDeadline > deadline");
        require(maxStake >= minStake, "Invalid: maxStake < minStake");
        
        goalId = goalCount++;
        
        goals[goalId] = Goal({
            id: goalId,
            name: name,
            target: target,
            minStake: minStake,
            maxStake: maxStake,
            startTime: startTime,
            entryDeadline: entryDeadline,
            deadline: deadline,
            active: true,
            settled: false,
            totalStaked: 0,
            participantCount: 0
        });
        
        goalTypes[goalId] = goalType;
        
        emit GoalCreated(goalId, name, goalType, target, minStake, maxStake, startTime, entryDeadline, deadline);
    }
    
    /**
     * @notice Deactivate a goal (no new participants)
     */
    function deactivateGoal(uint256 goalId) external onlyOwner {
        goals[goalId].active = false;
    }
    
    /**
     * @notice Cancel a goal and refund all participants
     * @dev Can only cancel goals that haven't been settled
     */
    function cancelGoalWithRefund(uint256 goalId) external onlyOwner {
        Goal storage goal = goals[goalId];
        require(!goal.settled, "Already settled");
        
        goal.active = false;
        goal.settled = true;  // Mark as settled to prevent future actions
        
        // Refund all participants
        address[] storage addrs = goalParticipants[goalId];
        for (uint256 i = 0; i < addrs.length; i++) {
            Participant storage p = participants[goalId][addrs[i]];
            if (p.stake > 0 && !p.claimed) {
                p.claimed = true;
                totalActiveStakes -= p.stake;
                
                // Withdraw from vault and send to user
                uint256 shares = vault.withdraw(p.stake, p.user, address(this));
                emit WithdrawnFromVault(p.stake, shares);
            }
        }
        
        emit GoalCancelled(goalId, addrs.length);
    }
    
    /**
     * @notice Update goal parameters (only if no one has joined yet)
     * @dev Cannot change goalType after creation
     */
    function updateGoal(
        uint256 goalId,
        string calldata name,
        uint256 target,
        uint256 minStake,
        uint256 maxStake,
        uint256 startTime,
        uint256 entryDeadline,
        uint256 deadline
    ) external onlyOwner {
        Goal storage goal = goals[goalId];
        require(goal.participantCount == 0, "Has participants");
        require(!goal.settled, "Already settled");
        require(deadline > startTime, "Invalid: deadline <= startTime");
        require(entryDeadline >= startTime, "Invalid: entryDeadline < startTime");
        require(entryDeadline <= deadline, "Invalid: entryDeadline > deadline");
        require(maxStake >= minStake, "Invalid: maxStake < minStake");
        
        goal.name = name;
        goal.target = target;
        goal.minStake = minStake;
        goal.maxStake = maxStake;
        goal.startTime = startTime;
        goal.entryDeadline = entryDeadline;
        goal.deadline = deadline;
        
        emit GoalUpdated(goalId, name, target, minStake, maxStake, entryDeadline, deadline);
    }
    
    /**
     * @notice Update platform fee (in basis points, max 2500 = 25%)
     */
    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 2500, "Fee too high (max 25%)");
        emit PlatformFeeUpdated(platformFeeBps, _feeBps);
        platformFeeBps = _feeBps;
    }
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _paused = false;
        emit Unpaused(msg.sender);
    }
    
    /**
     * @notice Sweep unclaimed funds after claim window expires
     * @dev Can only be called 30 days after goal deadline
     *      Sweeps: unclaimed winner payouts + entire loser pool if no winners
     */
    function sweepUnclaimedFunds(uint256 goalId) external onlyOwner {
        Goal storage goal = goals[goalId];
        
        if (!goal.settled) revert GoalNotSettled();
        if (block.timestamp < goal.deadline + CLAIM_WINDOW) revert ClaimWindowOpen();
        if (swept[goalId]) revert AlreadySwept();
        
        swept[goalId] = true;
        
        // Calculate unclaimed amount
        uint256 unclaimed;
        if (totalWinnerStakes[goalId] == 0) {
            // No winners - sweep entire pool
            unclaimed = goal.totalStaked;
        } else {
            // Some winners - sweep unclaimed portion
            uint256 expectedTotal = totalWinnerStakes[goalId] + loserPool[goalId];
            unclaimed = expectedTotal - totalClaimed[goalId];
        }
        
        if (unclaimed > 0) {
            totalActiveStakes -= unclaimed;
            
            // Withdraw from vault to treasury
            uint256 shares = vault.withdraw(unclaimed, treasury, address(this));
            emit WithdrawnFromVault(unclaimed, shares);
            emit UnclaimedSwept(goalId, unclaimed, treasury);
        }
    }
    
    /**
     * @notice Claim accrued yield from Morpho vault
     * @dev Yield = vault balance (in assets) - totalActiveStakes
     *      Can be called anytime by owner to harvest yield
     */
    function claimYield() external onlyOwner {
        // Get total value of our vault shares in USDC
        uint256 shares = vault.balanceOf(address(this));
        uint256 totalValue = vault.convertToAssets(shares);
        
        // Yield = total value - what we owe participants
        if (totalValue <= totalActiveStakes) revert NoYieldAvailable();
        
        uint256 yieldAmount = totalValue - totalActiveStakes;
        
        // Withdraw yield to treasury
        uint256 withdrawnShares = vault.withdraw(yieldAmount, treasury, address(this));
        emit WithdrawnFromVault(yieldAmount, withdrawnShares);
        emit YieldClaimed(yieldAmount, treasury);
    }
    
    // ============ View Functions ============
    
    function getGoal(uint256 goalId) external view returns (Goal memory) {
        return goals[goalId];
    }
    
    function getParticipant(uint256 goalId, address user) external view returns (Participant memory) {
        return participants[goalId][user];
    }
    
    function getGoalParticipants(uint256 goalId) external view returns (address[] memory) {
        return goalParticipants[goalId];
    }
    
    function getUserGoals(address user) external view returns (uint256[] memory) {
        return userGoals[user];
    }
    
    function getGoalSettlement(uint256 goalId) external view returns (
        uint256 _totalWinnerStakes,
        uint256 _loserPool,
        bool _settled
    ) {
        return (totalWinnerStakes[goalId], loserPool[goalId], goals[goalId].settled);
    }
    
    /**
     * @notice Calculate expected payout for a winner (before claiming)
     */
    function calculatePayout(uint256 goalId, address user) external view returns (uint256) {
        Goal storage goal = goals[goalId];
        Participant storage p = participants[goalId][user];
        
        if (!goal.settled || !p.succeeded || p.claimed) return 0;
        
        uint256 bonus = 0;
        if (totalWinnerStakes[goalId] > 0 && loserPool[goalId] > 0) {
            bonus = (p.stake * loserPool[goalId]) / totalWinnerStakes[goalId];
        }
        
        return p.stake + bonus;
    }
    
    /**
     * @notice Check if entry phase is still open
     */
    function isEntryOpen(uint256 goalId) external view returns (bool) {
        Goal storage goal = goals[goalId];
        return goal.active && block.timestamp <= goal.entryDeadline;
    }
    
    /**
     * @notice Get goal phase: 0 = Entry, 1 = Competition, 2 = Awaiting Settlement, 3 = Settled
     */
    function getGoalPhase(uint256 goalId) external view returns (uint8) {
        Goal storage goal = goals[goalId];
        
        if (goal.settled) return 3;  // Settled
        if (block.timestamp > goal.deadline) return 2;  // Awaiting settlement
        if (block.timestamp > goal.entryDeadline) return 1;  // Competition (entry closed)
        return 0;  // Entry open
    }
    
    /**
     * @notice Get current yield available to claim
     */
    function getAvailableYield() external view returns (uint256) {
        uint256 shares = vault.balanceOf(address(this));
        uint256 totalValue = vault.convertToAssets(shares);
        
        if (totalValue <= totalActiveStakes) return 0;
        return totalValue - totalActiveStakes;
    }
    
    /**
     * @notice Get total value in vault (principal + yield)
     */
    function getTotalVaultValue() external view returns (uint256) {
        uint256 shares = vault.balanceOf(address(this));
        return vault.convertToAssets(shares);
    }
}
