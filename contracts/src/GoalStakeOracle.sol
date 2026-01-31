// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGoalStake {
    function verifyChallenge(uint256 challengeId, uint256 actualMiles) external;
    function getChallenge(uint256 challengeId) external view returns (
        uint256 id,
        address user,
        uint256 targetMiles,
        uint256 stakeAmount,
        uint256 deadline,
        uint256 actualMiles,
        bool settled,
        bool success
    );
}

/**
 * @title GoalStakeOracle
 * @notice Oracle contract for verifying Strava activity data
 * @dev MVP version - will integrate with Chainlink Functions for production
 * 
 * Flow:
 * 1. User connects Strava and stores encrypted token
 * 2. When challenge deadline passes, keeper calls requestVerification()
 * 3. Off-chain service fetches Strava data and calls fulfillVerification()
 * 4. Contract calls GoalStake.verifyChallenge() with the result
 */
contract GoalStakeOracle {
    // ============ State ============
    
    IGoalStake public goalStake;
    address public owner;
    address public keeper; // Authorized to trigger verifications
    
    // Mapping from user address to encrypted Strava access token
    mapping(address => bytes) public encryptedTokens;
    
    // Pending verifications
    mapping(uint256 => bool) public pendingVerification;
    
    // ============ Events ============
    
    event TokenStored(address indexed user);
    event VerificationRequested(uint256 indexed challengeId, address indexed user);
    event VerificationFulfilled(uint256 indexed challengeId, uint256 miles, bool success);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyKeeper() {
        require(msg.sender == keeper || msg.sender == owner, "Not authorized");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _goalStake) {
        goalStake = IGoalStake(_goalStake);
        owner = msg.sender;
        keeper = msg.sender;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Store encrypted Strava access token
     * @dev Token should be encrypted client-side before sending
     * @param encryptedToken The encrypted Strava access token
     */
    function storeToken(bytes calldata encryptedToken) external {
        encryptedTokens[msg.sender] = encryptedToken;
        emit TokenStored(msg.sender);
    }
    
    /**
     * @notice Check if user has stored a token
     */
    function hasToken(address user) external view returns (bool) {
        return encryptedTokens[user].length > 0;
    }
    
    // ============ Verification Functions ============
    
    /**
     * @notice Request verification for a challenge (called by keeper)
     * @dev Emits event for off-chain service to process
     * @param challengeId The challenge ID to verify
     */
    function requestVerification(uint256 challengeId) external onlyKeeper {
        (
            ,
            address user,
            ,
            ,
            uint256 deadline,
            ,
            bool settled,
        ) = goalStake.getChallenge(challengeId);
        
        require(!settled, "Already settled");
        require(block.timestamp >= deadline, "Not yet deadline");
        require(encryptedTokens[user].length > 0, "No token for user");
        require(!pendingVerification[challengeId], "Already pending");
        
        pendingVerification[challengeId] = true;
        
        emit VerificationRequested(challengeId, user);
    }
    
    /**
     * @notice Fulfill verification with Strava data (called by keeper/oracle)
     * @dev In production, this would be called by Chainlink Functions callback
     * @param challengeId The challenge ID
     * @param actualMiles Miles verified from Strava (with 18 decimals)
     */
    function fulfillVerification(
        uint256 challengeId,
        uint256 actualMiles
    ) external onlyKeeper {
        require(pendingVerification[challengeId], "Not pending");
        
        pendingVerification[challengeId] = false;
        
        // Call GoalStake to verify and settle
        goalStake.verifyChallenge(challengeId, actualMiles);
        
        (,,,,,, bool settled, bool success) = goalStake.getChallenge(challengeId);
        
        emit VerificationFulfilled(challengeId, actualMiles, success);
    }
    
    // ============ Admin Functions ============
    
    function setKeeper(address _keeper) external onlyOwner {
        keeper = _keeper;
    }
    
    function setGoalStake(address _goalStake) external onlyOwner {
        goalStake = IGoalStake(_goalStake);
    }
}
