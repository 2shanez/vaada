// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title VaadaV3
 * @notice Shared goal pools with entry windows and stake-weighted payouts
 * @dev Entry Phase → Competition Phase → Settlement
 *      - Entry phase: users can join (and start competing)
 *      - Competition phase: no new entries, just complete the goal
 *      - Settlement: verify results, distribute payouts
 */
contract VaadaV3 {
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
        uint256 actualMiles;      // Verified miles from oracle
        bool verified;            // Has oracle reported?
        bool succeeded;           // Did they hit target?
        bool claimed;             // Have they claimed payout?
    }

    // ============ State ============
    
    IERC20 public immutable usdc;
    address public oracle;
    address public owner;
    address public treasury;
    
    uint256 public goalCount;
    uint256 public constant CLAIM_WINDOW = 30 days;
    
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
        uint256 actualMiles,
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
    
    // ============ Errors ============
    
    error NotOwner();
    error NotOracle();
    error GoalNotActive();
    error GoalNotSettled();
    error EntryClosed();           // NEW: Entry phase has ended
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
    
    constructor(address _usdc, address _oracle, address _treasury) {
        usdc = IERC20(_usdc);
        oracle = _oracle;
        treasury = _treasury;
        owner = msg.sender;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Join a goal with a stake (only during entry phase)
     * @param goalId The goal to join
     * @param stake Amount of USDC to stake
     */
    function joinGoal(uint256 goalId, uint256 stake) external {
        Goal storage goal = goals[goalId];
        
        if (!goal.active) revert GoalNotActive();
        if (block.timestamp > goal.entryDeadline) revert EntryClosed();
        if (participants[goalId][msg.sender].stake > 0) revert AlreadyJoined();
        if (stake < goal.minStake) revert StakeTooLow();
        if (stake > goal.maxStake) revert StakeTooHigh();
        
        // Transfer USDC
        require(usdc.transferFrom(msg.sender, address(this), stake), "Transfer failed");
        
        // Record participation
        participants[goalId][msg.sender] = Participant({
            user: msg.sender,
            stake: stake,
            actualMiles: 0,
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
    function claimPayout(uint256 goalId) external {
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
        
        require(usdc.transfer(msg.sender, totalPayout), "Payout failed");
        
        emit PayoutClaimed(goalId, msg.sender, p.stake, bonus, totalPayout);
    }
    
    // ============ Oracle Functions ============
    
    /**
     * @notice Verify a participant's miles (called by oracle)
     * @param goalId The goal
     * @param user The participant
     * @param actualMiles Miles verified from Strava
     */
    function verifyParticipant(
        uint256 goalId,
        address user,
        uint256 actualMiles
    ) external onlyOracle {
        Goal storage goal = goals[goalId];
        Participant storage p = participants[goalId][user];
        
        if (block.timestamp < goal.deadline) revert DeadlineNotReached();
        if (p.stake == 0) revert NotParticipant();
        if (p.verified) revert AlreadyVerified();
        
        p.verified = true;
        p.actualMiles = actualMiles;
        p.succeeded = actualMiles >= goal.target;
        
        emit ParticipantVerified(goalId, user, actualMiles, p.succeeded);
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
        
        goal.settled = true;
        goal.active = false;
        totalWinnerStakes[goalId] = winnerStakes;
        loserPool[goalId] = loserStakes;
        
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
                usdc.transfer(p.user, p.stake);
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
        // Total pool = totalStaked = winnerStakes + loserPool
        // Expected claims = totalWinnerStakes + loserPool (if winners exist)
        // If no winners: entire pool is unclaimed
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
            require(usdc.transfer(treasury, unclaimed), "Sweep failed");
            emit UnclaimedSwept(goalId, unclaimed, treasury);
        }
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
}
