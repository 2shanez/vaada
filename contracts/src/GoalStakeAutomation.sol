// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {AutomationCompatibleInterface} from "chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

interface IGoalStake {
    struct Challenge {
        uint256 id;
        address user;
        uint256 targetMiles;
        uint256 stakeAmount;
        uint256 deadline;
        uint256 actualMiles;
        bool settled;
        bool success;
    }
    
    function verifyChallenge(uint256 challengeId, uint256 actualMiles) external;
    function getChallenge(uint256 challengeId) external view returns (Challenge memory);
    function challengeCount() external view returns (uint256);
}

/**
 * @title GoalStakeAutomation
 * @notice Automated verification using Chainlink Automation + Functions
 * @dev Checks for challenges past deadline, triggers Strava verification via Chainlink Functions
 * 
 * Architecture:
 * 1. Chainlink Automation calls checkUpkeep() every block
 * 2. If challenges need verification, performUpkeep() is called
 * 3. performUpkeep() sends Chainlink Functions request to fetch Strava data
 * 4. fulfillRequest() receives the miles and settles the challenge
 */
contract GoalStakeAutomation is FunctionsClient, AutomationCompatibleInterface {
    using FunctionsRequest for FunctionsRequest.Request;

    // ============ State ============
    
    IGoalStake public goalStake;
    address public owner;
    
    // Chainlink Functions config
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    bytes public functionsSource; // JavaScript source code
    
    // User Strava tokens (encrypted)
    mapping(address => string) public stravaTokens;
    
    // Track pending requests
    mapping(bytes32 => uint256) public requestToChallengeId;
    mapping(uint256 => bool) public pendingVerification;
    
    // Track last checked challenge ID for efficiency
    uint256 public lastCheckedId;
    
    // ============ Events ============
    
    event TokenStored(address indexed user);
    event VerificationRequested(uint256 indexed challengeId, bytes32 requestId);
    event VerificationFulfilled(uint256 indexed challengeId, uint256 miles, bool success);
    event VerificationFailed(uint256 indexed challengeId, bytes error);
    
    // ============ Errors ============
    
    error NotOwner();
    error NoTokenForUser();
    error AlreadyPending();
    error UnexpectedRequestId(bytes32 requestId);
    
    // ============ Constructor ============
    
    constructor(
        address _router,
        address _goalStake,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(_router) {
        goalStake = IGoalStake(_goalStake);
        donId = _donId;
        subscriptionId = _subscriptionId;
        owner = msg.sender;
    }
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Store Strava access token for verification
     * @param token The Strava access token (consider encrypting off-chain)
     */
    function storeToken(string calldata token) external {
        stravaTokens[msg.sender] = token;
        emit TokenStored(msg.sender);
    }
    
    function hasToken(address user) external view returns (bool) {
        return bytes(stravaTokens[user]).length > 0;
    }
    
    // ============ Chainlink Automation ============
    
    /**
     * @notice Check if any challenges need verification
     * @dev Called by Chainlink Automation nodes
     */
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 count = goalStake.challengeCount();
        
        // Find first challenge that needs verification
        for (uint256 i = lastCheckedId; i < count; i++) {
            IGoalStake.Challenge memory challenge = goalStake.getChallenge(i);
            
            if (
                !challenge.settled &&
                !pendingVerification[i] &&
                block.timestamp >= challenge.deadline &&
                bytes(stravaTokens[challenge.user]).length > 0
            ) {
                return (true, abi.encode(i));
            }
        }
        
        // Also check earlier IDs in case we missed any
        for (uint256 i = 0; i < lastCheckedId && i < count; i++) {
            IGoalStake.Challenge memory challenge = goalStake.getChallenge(i);
            
            if (
                !challenge.settled &&
                !pendingVerification[i] &&
                block.timestamp >= challenge.deadline &&
                bytes(stravaTokens[challenge.user]).length > 0
            ) {
                return (true, abi.encode(i));
            }
        }
        
        return (false, "");
    }
    
    /**
     * @notice Trigger verification for a challenge
     * @dev Called by Chainlink Automation when checkUpkeep returns true
     */
    function performUpkeep(bytes calldata performData) external override {
        uint256 challengeId = abi.decode(performData, (uint256));
        
        IGoalStake.Challenge memory challenge = goalStake.getChallenge(challengeId);
        
        // Validate
        require(!challenge.settled, "Already settled");
        require(block.timestamp >= challenge.deadline, "Not yet deadline");
        require(!pendingVerification[challengeId], "Already pending");
        
        string memory token = stravaTokens[challenge.user];
        require(bytes(token).length > 0, "No token");
        
        pendingVerification[challengeId] = true;
        lastCheckedId = challengeId + 1;
        
        // Build Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(string(functionsSource));
        
        // Pass arguments: token, challenge start (deadline - duration), deadline
        string[] memory args = new string[](3);
        args[0] = token;
        // For simplicity, assume challenge started 30 days before deadline
        // In production, you'd store the start time in the contract
        args[1] = _uint2str(challenge.deadline - 30 days);
        args[2] = _uint2str(challenge.deadline);
        req.setArgs(args);
        
        // Send request
        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        requestToChallengeId[requestId] = challengeId;
        
        emit VerificationRequested(challengeId, requestId);
    }
    
    // ============ Chainlink Functions Callback ============
    
    /**
     * @notice Receive verification result from Chainlink Functions
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        uint256 challengeId = requestToChallengeId[requestId];
        
        if (challengeId == 0 && requestToChallengeId[requestId] != 0) {
            revert UnexpectedRequestId(requestId);
        }
        
        pendingVerification[challengeId] = false;
        delete requestToChallengeId[requestId];
        
        if (err.length > 0) {
            emit VerificationFailed(challengeId, err);
            return;
        }
        
        // Decode miles from response (uint256 encoded)
        uint256 actualMiles = abi.decode(response, (uint256));
        
        // Call GoalStake to verify and settle
        goalStake.verifyChallenge(challengeId, actualMiles);
        
        IGoalStake.Challenge memory challenge = goalStake.getChallenge(challengeId);
        
        emit VerificationFulfilled(challengeId, actualMiles, challenge.success);
    }
    
    // ============ Admin Functions ============
    
    function setFunctionsSource(bytes calldata source) external onlyOwner {
        functionsSource = source;
    }
    
    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }
    
    function setGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }
    
    function setDonId(bytes32 _donId) external onlyOwner {
        donId = _donId;
    }
    
    function setGoalStake(address _goalStake) external onlyOwner {
        goalStake = IGoalStake(_goalStake);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    // ============ Helpers ============
    
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    // ============ Manual Verification (for testing) ============
    
    /**
     * @notice Manually trigger verification (owner only, for testing)
     */
    function manualVerify(uint256 challengeId, uint256 actualMiles) external onlyOwner {
        goalStake.verifyChallenge(challengeId, actualMiles);
        
        IGoalStake.Challenge memory challenge = goalStake.getChallenge(challengeId);
        emit VerificationFulfilled(challengeId, actualMiles, challenge.success);
    }
}
