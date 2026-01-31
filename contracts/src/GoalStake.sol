// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title GoalStake
 * @notice Stake money on your fitness goals. Hit them or lose them.
 * @dev MVP version - single challenge pool, Strava verification via Chainlink Functions
 */
contract GoalStake {
    // ============ Structs ============
    
    struct Challenge {
        uint256 id;
        address user;
        uint256 targetMiles;      // Target miles (in wei for precision, 1e18 = 1 mile)
        uint256 stakeAmount;      // USDC staked (6 decimals)
        uint256 deadline;         // Unix timestamp
        uint256 actualMiles;      // Verified miles from Strava
        bool settled;             // Has this challenge been settled?
        bool success;             // Did user hit their goal?
    }

    // ============ State ============
    
    IERC20 public immutable usdc;
    address public oracle;        // Chainlink Functions oracle address
    address public owner;
    
    uint256 public challengeCount;
    uint256 public loserPool;     // Accumulated stakes from failed challenges
    uint256 public minStake = 10e6;  // Minimum 10 USDC
    uint256 public maxStake = 1000e6; // Maximum 1000 USDC
    
    mapping(uint256 => Challenge) public challenges;
    mapping(address => uint256[]) public userChallenges;
    
    // ============ Events ============
    
    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed user,
        uint256 targetMiles,
        uint256 stakeAmount,
        uint256 deadline
    );
    
    event ChallengeVerified(
        uint256 indexed challengeId,
        uint256 actualMiles,
        bool success
    );
    
    event ChallengSettled(
        uint256 indexed challengeId,
        address indexed user,
        uint256 payout,
        bool success
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
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
     * @notice Create a new fitness challenge
     * @param targetMiles Target miles to run (1e18 = 1 mile)
     * @param stakeAmount Amount of USDC to stake
     * @param duration Challenge duration in seconds
     */
    function createChallenge(
        uint256 targetMiles,
        uint256 stakeAmount,
        uint256 duration
    ) external returns (uint256 challengeId) {
        require(stakeAmount >= minStake, "Stake too low");
        require(stakeAmount <= maxStake, "Stake too high");
        require(targetMiles > 0, "Target must be > 0");
        require(duration >= 1 days, "Duration too short");
        require(duration <= 90 days, "Duration too long");
        
        // Transfer USDC from user
        require(usdc.transferFrom(msg.sender, address(this), stakeAmount), "Transfer failed");
        
        challengeId = challengeCount++;
        
        challenges[challengeId] = Challenge({
            id: challengeId,
            user: msg.sender,
            targetMiles: targetMiles,
            stakeAmount: stakeAmount,
            deadline: block.timestamp + duration,
            actualMiles: 0,
            settled: false,
            success: false
        });
        
        userChallenges[msg.sender].push(challengeId);
        
        emit ChallengeCreated(
            challengeId,
            msg.sender,
            targetMiles,
            stakeAmount,
            block.timestamp + duration
        );
    }
    
    // ============ Oracle Functions ============
    
    /**
     * @notice Called by Chainlink Functions to verify challenge result
     * @param challengeId The challenge to verify
     * @param actualMiles Actual miles run (from Strava)
     */
    function verifyChallenge(
        uint256 challengeId,
        uint256 actualMiles
    ) external onlyOracle {
        Challenge storage challenge = challenges[challengeId];
        
        require(!challenge.settled, "Already settled");
        require(block.timestamp >= challenge.deadline, "Not yet deadline");
        
        challenge.actualMiles = actualMiles;
        challenge.success = actualMiles >= challenge.targetMiles;
        
        emit ChallengeVerified(challengeId, actualMiles, challenge.success);
        
        _settleChallenge(challengeId);
    }
    
    // ============ Internal Functions ============
    
    function _settleChallenge(uint256 challengeId) internal {
        Challenge storage challenge = challenges[challengeId];
        
        require(!challenge.settled, "Already settled");
        challenge.settled = true;
        
        uint256 payout;
        
        if (challenge.success) {
            // Winner gets their stake back + share of loser pool
            uint256 bonus = loserPool / 10; // 10% of loser pool as bonus
            if (bonus > loserPool) bonus = loserPool;
            loserPool -= bonus;
            
            payout = challenge.stakeAmount + bonus;
            require(usdc.transfer(challenge.user, payout), "Payout failed");
        } else {
            // Loser's stake goes to the pool
            loserPool += challenge.stakeAmount;
            payout = 0;
        }
        
        emit ChallengSettled(challengeId, challenge.user, payout, challenge.success);
    }
    
    // ============ View Functions ============
    
    function getChallenge(uint256 challengeId) external view returns (Challenge memory) {
        return challenges[challengeId];
    }
    
    function getUserChallenges(address user) external view returns (uint256[] memory) {
        return userChallenges[user];
    }
    
    function getLoserPool() external view returns (uint256) {
        return loserPool;
    }
    
    // ============ Admin Functions ============
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
    
    function setStakeLimits(uint256 _min, uint256 _max) external onlyOwner {
        minStake = _min;
        maxStake = _max;
    }
}
