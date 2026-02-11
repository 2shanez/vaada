// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {AutomationCompatibleInterface} from "chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

interface IGoalStakeV3 {
    // Goal types: 0 = STRAVA_MILES, 1 = FITBIT_STEPS
    enum GoalType { STRAVA_MILES, FITBIT_STEPS }
    
    struct Goal {
        uint256 id;
        string name;
        uint256 target;           // Miles (1e18=1mi) or steps (1e18=1step)
        uint256 minStake;
        uint256 maxStake;
        uint256 startTime;        // When goal starts
        uint256 entryDeadline;    // When entry closes
        uint256 deadline;         // When competition ends
        bool active;
        bool settled;
        uint256 totalStaked;
        uint256 participantCount;
    }
    
    struct Participant {
        address user;
        uint256 stake;
        uint256 actualMiles;
        bool verified;
        bool succeeded;
        bool claimed;
    }
    
    function verifyParticipant(uint256 goalId, address user, uint256 actualMiles) external;
    function settleGoal(uint256 goalId) external;
    function getGoal(uint256 goalId) external view returns (Goal memory);
    function goalTypes(uint256 goalId) external view returns (GoalType);
    function getGoalParticipants(uint256 goalId) external view returns (address[] memory);
    function getParticipant(uint256 goalId, address user) external view returns (Participant memory);
    function goalCount() external view returns (uint256);
}

/**
 * @title GoalStakeAutomationV3
 * @notice Automated verification using Chainlink Automation + Functions for GoalStakeV3
 * @dev Updated to work with V3's multi-participant goals
 */
contract GoalStakeAutomationV3 is FunctionsClient, AutomationCompatibleInterface {
    using FunctionsRequest for FunctionsRequest.Request;

    // ============ State ============
    
    IGoalStakeV3 public goalStake;
    address public owner;
    
    // Chainlink Functions config
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    bytes public functionsSource;
    string public apiBaseUrl = "https://vaada.io"; // Verification API base URL
    
    // User Strava tokens
    mapping(address => string) public stravaTokens;
    
    // Track pending requests: requestId => (goalId, user)
    struct PendingRequest {
        uint256 goalId;
        address user;
    }
    mapping(bytes32 => PendingRequest) public pendingRequests;
    mapping(uint256 => mapping(address => bool)) public pendingVerification;
    
    // Track goals needing settlement
    mapping(uint256 => bool) public pendingSettlement;
    
    // ============ Events ============
    
    event TokenStored(address indexed user);
    event VerificationRequested(uint256 indexed goalId, address indexed user, bytes32 requestId);
    event VerificationFulfilled(uint256 indexed goalId, address indexed user, uint256 miles, bool success);
    event VerificationFailed(uint256 indexed goalId, address indexed user, bytes error);
    event GoalSettled(uint256 indexed goalId);
    
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
        goalStake = IGoalStakeV3(_goalStake);
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
    
    function storeToken(string calldata token) external {
        stravaTokens[msg.sender] = token;
        emit TokenStored(msg.sender);
    }
    
    /**
     * @notice Store token on behalf of a user (owner only)
     * @dev Allows backend to refresh expired tokens without user signature
     */
    function storeTokenFor(address user, string calldata token) external onlyOwner {
        stravaTokens[user] = token;
        emit TokenStored(user);
    }
    
    function hasToken(address user) external view returns (bool) {
        return bytes(stravaTokens[user]).length > 0;
    }
    
    // ============ Chainlink Automation ============
    
    /**
     * @notice Check if any participants need verification or goals need settlement
     */
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 count = goalStake.goalCount();
        
        for (uint256 goalId = 0; goalId < count; goalId++) {
            IGoalStakeV3.Goal memory goal = goalStake.getGoal(goalId);
            
            // Skip if already settled
            if (goal.settled) continue;
            
            // Skip if deadline hasn't passed
            if (block.timestamp < goal.deadline) continue;
            
            // Check if all participants are verified
            address[] memory participants = goalStake.getGoalParticipants(goalId);
            bool allVerified = true;
            
            for (uint256 j = 0; j < participants.length; j++) {
                address user = participants[j];
                IGoalStakeV3.Participant memory p = goalStake.getParticipant(goalId, user);
                
                if (!p.verified) {
                    allVerified = false;
                    
                    // Check if we can verify this participant
                    if (
                        !pendingVerification[goalId][user] &&
                        bytes(stravaTokens[user]).length > 0
                    ) {
                        // Return data to verify this participant
                        return (true, abi.encode(goalId, user, false));
                    }
                }
            }
            
            // If all verified but not settled, trigger settlement
            if (allVerified && participants.length > 0 && !pendingSettlement[goalId]) {
                return (true, abi.encode(goalId, address(0), true));
            }
        }
        
        return (false, "");
    }
    
    /**
     * @notice Trigger verification or settlement
     */
    function performUpkeep(bytes calldata performData) external override {
        (uint256 goalId, address user, bool isSettlement) = abi.decode(performData, (uint256, address, bool));
        
        if (isSettlement) {
            _settleGoal(goalId);
        } else {
            _requestVerification(goalId, user);
        }
    }
    
    function _requestVerification(uint256 goalId, address user) internal {
        IGoalStakeV3.Goal memory goal = goalStake.getGoal(goalId);
        
        require(!goal.settled, "Already settled");
        require(block.timestamp >= goal.deadline, "Not yet deadline");
        require(!pendingVerification[goalId][user], "Already pending");
        
        // Note: Token is now stored in database, not on-chain
        // The /api/verify endpoint will return error if user hasn't connected Strava
        
        pendingVerification[goalId][user] = true;
        
        // Get goal type to determine verification method
        IGoalStakeV3.GoalType goalType = goalStake.goalTypes(goalId);
        string memory typeStr = goalType == IGoalStakeV3.GoalType.STRAVA_MILES ? "miles" : "steps";
        
        // Build Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(string(functionsSource));
        
        // Arguments: user wallet, start time, end time, goal type, api url
        string[] memory args = new string[](5);
        args[0] = _addressToString(user);
        args[1] = _uint2str(goal.startTime); // Activities count from goal start
        args[2] = _uint2str(goal.deadline);
        args[3] = typeStr; // "miles" or "steps"
        args[4] = apiBaseUrl; // Our verification API
        req.setArgs(args);
        
        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );
        
        pendingRequests[requestId] = PendingRequest(goalId, user);
        
        emit VerificationRequested(goalId, user, requestId);
    }
    
    function _settleGoal(uint256 goalId) internal {
        pendingSettlement[goalId] = true;
        goalStake.settleGoal(goalId);
        emit GoalSettled(goalId);
    }
    
    // ============ Chainlink Functions Callback ============
    
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        PendingRequest memory req = pendingRequests[requestId];
        uint256 goalId = req.goalId;
        address user = req.user;
        
        pendingVerification[goalId][user] = false;
        delete pendingRequests[requestId];
        
        uint256 actualMiles;
        
        if (err.length > 0) {
            // On error (e.g., expired token), verify with 0 miles so goal can settle
            emit VerificationFailed(goalId, user, err);
            actualMiles = 0;
        } else {
            actualMiles = abi.decode(response, (uint256));
        }
        
        goalStake.verifyParticipant(goalId, user, actualMiles);
        
        IGoalStakeV3.Participant memory p = goalStake.getParticipant(goalId, user);
        
        emit VerificationFulfilled(goalId, user, actualMiles, p.succeeded);
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
        goalStake = IGoalStakeV3(_goalStake);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    // ============ Manual Functions (for testing) ============
    
    function manualVerify(uint256 goalId, address user, uint256 actualMiles) external onlyOwner {
        goalStake.verifyParticipant(goalId, user, actualMiles);
        IGoalStakeV3.Participant memory p = goalStake.getParticipant(goalId, user);
        emit VerificationFulfilled(goalId, user, actualMiles, p.succeeded);
    }
    
    function manualSettle(uint256 goalId) external onlyOwner {
        goalStake.settleGoal(goalId);
        emit GoalSettled(goalId);
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
    
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(_addr);
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
    
    function setApiBaseUrl(string calldata _url) external onlyOwner {
        apiBaseUrl = _url;
    }
}
