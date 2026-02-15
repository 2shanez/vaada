// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

// Minimal ERC4626 interface for Morpho vault
interface IERC4626 {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function maxWithdraw(address owner) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title NewUserChallenge
 * @notice Onboarding challenge: stake $5, join a goal within 24h or forfeit to platform
 * @dev Users can only join once ever. Uses Chainlink Functions to verify goal participation.
 *      Stakes are deposited into Morpho vault to earn yield while locked.
 */
contract NewUserChallenge is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    // ═══════════════════════════════════════════════════════════════════
    // STRUCTS & STATE
    // ═══════════════════════════════════════════════════════════════════

    struct Challenge {
        uint256 amount;         // Amount staked (5 USDC)
        uint256 deadline;       // Timestamp when 24h expires
        bool settled;           // Whether challenge has been settled
        bool won;               // Whether user won (joined a goal)
    }

    // Core state
    IERC20 public immutable usdc;
    IERC4626 public immutable vault;  // Morpho vault for yield
    address public immutable goalStakeV3;
    address public treasury;
    address public owner;

    // Challenge parameters
    uint256 public stakeAmount = 5 * 1e6;  // 5 USDC (6 decimals)
    uint256 public challengeDuration = 24 hours;

    // Track total active stakes for yield calculation
    uint256 public totalActiveStakes;

    // User challenges (one per user, ever)
    mapping(address => Challenge) public challenges;
    mapping(address => bool) public hasJoinedChallenge;

    // Chainlink Functions
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300_000;
    bytes public verificationSource;

    // Track pending verifications
    mapping(bytes32 => address) public pendingRequests;

    // Stats
    uint256 public totalChallenges;
    uint256 public totalWon;
    uint256 public totalForfeited;

    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event ChallengeJoined(address indexed user, uint256 amount, uint256 deadline);
    event ChallengeSettled(address indexed user, bool won, uint256 amount);
    event VerificationRequested(bytes32 indexed requestId, address indexed user);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event DepositedToVault(uint256 assets, uint256 shares);
    event WithdrawnFromVault(uint256 assets, uint256 shares);
    event YieldClaimed(uint256 amount);

    // ═══════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════

    error AlreadyJoined();
    error NotJoined();
    error AlreadySettled();
    error DeadlineNotReached();
    error OnlyOwner();
    error TransferFailed();
    error NoYieldAvailable();

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(
        address _usdc,
        address _vault,
        address _goalStakeV3,
        address _treasury,
        address _functionsRouter,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(_functionsRouter) {
        usdc = IERC20(_usdc);
        vault = IERC4626(_vault);
        goalStakeV3 = _goalStakeV3;
        treasury = _treasury;
        owner = msg.sender;
        donId = _donId;
        subscriptionId = _subscriptionId;

        // Approve vault to spend USDC (max approval)
        IERC20(_usdc).approve(_vault, type(uint256).max);
    }

    // ═══════════════════════════════════════════════════════════════════
    // USER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Join the new user challenge by staking $5 USDC
     * @dev User must approve USDC transfer first. Can only join once ever.
     */
    function join() external {
        if (hasJoinedChallenge[msg.sender]) revert AlreadyJoined();

        // Transfer stake from user
        bool success = usdc.transferFrom(msg.sender, address(this), stakeAmount);
        if (!success) revert TransferFailed();

        // Deposit USDC to Morpho vault for yield
        uint256 shares = vault.deposit(stakeAmount, address(this));
        emit DepositedToVault(stakeAmount, shares);

        // Track active stakes
        totalActiveStakes += stakeAmount;

        // Record challenge
        challenges[msg.sender] = Challenge({
            amount: stakeAmount,
            deadline: block.timestamp + challengeDuration,
            settled: false,
            won: false
        });
        hasJoinedChallenge[msg.sender] = true;
        totalChallenges++;

        emit ChallengeJoined(msg.sender, stakeAmount, block.timestamp + challengeDuration);
    }

    /**
     * @notice Request settlement verification for a user
     * @dev Can be called by anyone after deadline. Uses Chainlink Functions.
     */
    function requestSettlement(address user) external {
        Challenge storage c = challenges[user];
        
        if (!hasJoinedChallenge[user]) revert NotJoined();
        if (c.settled) revert AlreadySettled();
        if (block.timestamp < c.deadline) revert DeadlineNotReached();

        // Build Chainlink Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(string(verificationSource));
        
        // Pass user address and GoalStakeV3 address as args
        string[] memory args = new string[](2);
        args[0] = _addressToString(user);
        args[1] = _addressToString(goalStakeV3);
        req.setArgs(args);

        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        pendingRequests[requestId] = user;
        emit VerificationRequested(requestId, user);
    }

    /**
     * @notice Chainlink Functions callback
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory /* err */
    ) internal override {
        address user = pendingRequests[requestId];
        if (user == address(0)) return;

        Challenge storage c = challenges[user];
        if (c.settled) return;

        // Parse response: "1" = won (joined a goal), "0" = lost
        bool won = keccak256(response) == keccak256(bytes("1"));
        
        c.settled = true;
        c.won = won;

        // Withdraw from vault
        uint256 shares = vault.withdraw(c.amount, address(this), address(this));
        emit WithdrawnFromVault(c.amount, shares);
        totalActiveStakes -= c.amount;

        if (won) {
            // Refund user
            totalWon++;
            usdc.transfer(user, c.amount);
        } else {
            // Send to treasury
            totalForfeited++;
            usdc.transfer(treasury, c.amount);
        }

        delete pendingRequests[requestId];
        emit ChallengeSettled(user, won, c.amount);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function getChallenge(address user) external view returns (
        uint256 amount,
        uint256 deadline,
        bool settled,
        bool won,
        bool canSettle
    ) {
        Challenge memory c = challenges[user];
        return (
            c.amount,
            c.deadline,
            c.settled,
            c.won,
            block.timestamp >= c.deadline && !c.settled
        );
    }

    function getStats() external view returns (
        uint256 _totalChallenges,
        uint256 _totalWon,
        uint256 _totalForfeited,
        uint256 _pendingAmount
    ) {
        uint256 pending = totalChallenges - totalWon - totalForfeited;
        return (totalChallenges, totalWon, totalForfeited, pending * stakeAmount);
    }

    /**
     * @notice Get available yield to claim
     */
    function getAvailableYield() external view returns (uint256) {
        uint256 totalValue = vault.maxWithdraw(address(this));
        if (totalValue <= totalActiveStakes) return 0;
        return totalValue - totalActiveStakes;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /**
     * @notice Claim accumulated yield to treasury
     */
    function claimYield() external onlyOwner {
        uint256 totalValue = vault.maxWithdraw(address(this));
        if (totalValue <= totalActiveStakes) revert NoYieldAvailable();
        
        uint256 yieldAmount = totalValue - totalActiveStakes;
        uint256 shares = vault.withdraw(yieldAmount, treasury, address(this));
        
        emit WithdrawnFromVault(yieldAmount, shares);
        emit YieldClaimed(yieldAmount);
    }

    function setVerificationSource(bytes calldata _source) external onlyOwner {
        verificationSource = _source;
    }

    function setTreasury(address _treasury) external onlyOwner {
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setStakeAmount(uint256 _amount) external onlyOwner {
        stakeAmount = _amount;
    }

    function setChallengeDuration(uint256 _duration) external onlyOwner {
        challengeDuration = _duration;
    }

    function setGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
