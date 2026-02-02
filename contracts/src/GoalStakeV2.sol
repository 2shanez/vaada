// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title GoalStakeV2
 * @notice Shared goal pools with stake-weighted payouts
 * @dev Users join predefined goals, compete in the same pool, winners split losers' stakes
 */
contract GoalStakeV2 {
    // ============ Structs ============
    
    struct Goal {
        uint256 id;
        string name;              // e.g., "Run 10 miles this week"
        uint256 targetMiles;      // Target in wei (1e18 = 1 mile)
        uint256 minStake;         // Minimum stake to join
        uint256 maxStake;         // Maximum stake to join
        uint256 startTime;        // When goal starts (activities before don't count)
        uint256 deadline;         // When goal ends
        bool active;              // Can users still join?
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
    
    uint256 public goalCount;
    
    // Goal ID => Goal
    mapping(uint256 => Goal) public goals;
    
    // Goal ID => participant address => Participant
    mapping(uint256 => mapping(address => Participant)) public participants;
    
    // Goal ID => list of participant addresses
    mapping(uint256 => address[]) public goalParticipants;
    
    // User => list of goal IDs they've joined
    mapping(address => uint256[]) public userGoals;
    
    // Goal ID => settlement data (calculated once during settle)
    mapping(uint256 => uint256) public totalWinnerStakes;
    mapping(uint256 => uint256) public loserPool;
    
    // ============ Events ============
    
    event GoalCreated(
        uint256 indexed goalId,
        string name,
        uint256 targetMiles,
        uint256 minStake,
        uint256 maxStake,
        uint256 startTime,
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
    
    // ============ Errors ============
    
    error NotOwner();
    error NotOracle();
    error GoalNotActive();
    error GoalNotSettled();
    error AlreadyJoined();
    error StakeTooLow();
    error StakeTooHigh();
    error DeadlineNotReached();
    error AlreadyVerified();
    error AlreadyClaimed();
    error NotParticipant();
    error NotAllVerified();
    error DidNotSucceed();
    
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
    
    constructor(address _usdc, address _oracle) {
        usdc = IERC20(_usdc);
        oracle = _oracle;
        owner = msg.sender;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Join a goal with a stake
     * @param goalId The goal to join
     * @param stake Amount of USDC to stake
     */
    function joinGoal(uint256 goalId, uint256 stake) external {
        Goal storage goal = goals[goalId];
        
        if (!goal.active) revert GoalNotActive();
        if (block.timestamp >= goal.deadline) revert GoalNotActive();
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
        p.succeeded = actualMiles >= goal.targetMiles;
        
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
     * @notice Create a new goal
     */
    function createGoal(
        string calldata name,
        uint256 targetMiles,
        uint256 minStake,
        uint256 maxStake,
        uint256 startTime,
        uint256 deadline
    ) external onlyOwner returns (uint256 goalId) {
        require(deadline > startTime, "Invalid times");
        require(maxStake >= minStake, "Invalid stakes");
        
        goalId = goalCount++;
        
        goals[goalId] = Goal({
            id: goalId,
            name: name,
            targetMiles: targetMiles,
            minStake: minStake,
            maxStake: maxStake,
            startTime: startTime,
            deadline: deadline,
            active: true,
            settled: false,
            totalStaked: 0,
            participantCount: 0
        });
        
        emit GoalCreated(goalId, name, targetMiles, minStake, maxStake, startTime, deadline);
    }
    
    /**
     * @notice Deactivate a goal (no new participants)
     */
    function deactivateGoal(uint256 goalId) external onlyOwner {
        goals[goalId].active = false;
    }
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
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
}
