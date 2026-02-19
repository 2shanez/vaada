// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

// Minimal ERC4626 interface for Morpho vault
interface IERC4626 {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function maxWithdraw(address owner) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

// Minimal VaadaV3 interface to check participation
interface IVaadaV3 {
    function goalCount() external view returns (uint256);
    function getParticipant(uint256 goalId, address user) external view returns (
        address userAddr, uint256 stake, uint256 actualMiles, bool verified, bool succeeded, bool claimed
    );
}

/**
 * @title NewUserChallengeV4
 * @notice Onboarding challenge: stake $5, join a goal within 24h or forfeit
 * @dev No Chainlink dependency. Settlement is server-side via adminSettle or
 *      fully onchain via selfSettle (checks VaadaV3 participation directly).
 *      Stakes deposited into Morpho vault to earn yield while locked.
 */
contract NewUserChallengeV4 {

    // ═══════════════════════════════════════════════════════════════════
    // STRUCTS & STATE
    // ═══════════════════════════════════════════════════════════════════

    struct Challenge {
        uint256 amount;
        uint256 deadline;
        bool settled;
        bool won;
    }

    IERC20 public immutable usdc;
    IERC4626 public immutable vault;
    IVaadaV3 public immutable goalStakeV3;
    address public treasury;
    address public owner;

    uint256 public stakeAmount = 5 * 1e6;  // 5 USDC
    uint256 public challengeDuration = 24 hours;
    uint256 public totalActiveStakes;

    mapping(address => Challenge) public challenges;
    mapping(address => bool) public hasJoinedChallenge;

    uint256 public totalChallenges;
    uint256 public totalWon;
    uint256 public totalForfeited;

    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event ChallengeJoined(address indexed user, uint256 amount, uint256 deadline);
    event ChallengeSettled(address indexed user, bool won, uint256 amount);
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
        address _treasury
    ) {
        usdc = IERC20(_usdc);
        vault = IERC4626(_vault);
        goalStakeV3 = IVaadaV3(_goalStakeV3);
        treasury = _treasury;
        owner = msg.sender;

        IERC20(_usdc).approve(_vault, type(uint256).max);
    }

    // ═══════════════════════════════════════════════════════════════════
    // USER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Join the new user challenge by staking $5 USDC
     */
    function join() external {
        if (hasJoinedChallenge[msg.sender]) revert AlreadyJoined();

        bool success = usdc.transferFrom(msg.sender, address(this), stakeAmount);
        if (!success) revert TransferFailed();

        uint256 shares = vault.deposit(stakeAmount, address(this));
        emit DepositedToVault(stakeAmount, shares);

        totalActiveStakes += stakeAmount;

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
     * @notice Self-settle: anyone can call after deadline. Checks VaadaV3 onchain.
     * @dev No oracle needed — reads participation directly from VaadaV3 contract.
     */
    function settle(address user) external {
        Challenge storage c = challenges[user];
        if (!hasJoinedChallenge[user]) revert NotJoined();
        if (c.settled) revert AlreadySettled();
        if (block.timestamp < c.deadline) revert DeadlineNotReached();

        // Check if user has joined any VaadaV3 goal (stake > 0)
        bool joined = _hasJoinedAnyGoal(user);

        _settle(user, joined);
    }

    /**
     * @notice Admin settle — owner can settle with explicit result
     * @dev Fallback if onchain check doesn't cover edge cases
     */
    function adminSettle(address user, bool won) external onlyOwner {
        Challenge storage c = challenges[user];
        if (!hasJoinedChallenge[user]) revert NotJoined();
        if (c.settled) revert AlreadySettled();
        if (block.timestamp < c.deadline) revert DeadlineNotReached();

        _settle(user, won);
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════════════

    function _settle(address user, bool won) internal {
        Challenge storage c = challenges[user];
        c.settled = true;
        c.won = won;

        uint256 shares = vault.withdraw(c.amount, address(this), address(this));
        emit WithdrawnFromVault(c.amount, shares);
        totalActiveStakes -= c.amount;

        if (won) {
            totalWon++;
            usdc.transfer(user, c.amount);
        } else {
            totalForfeited++;
            usdc.transfer(treasury, c.amount);
        }

        emit ChallengeSettled(user, won, c.amount);
    }

    /**
     * @notice Check if user has joined any goal on VaadaV3
     */
    function _hasJoinedAnyGoal(address user) internal view returns (bool) {
        uint256 count = goalStakeV3.goalCount();
        for (uint256 i = 0; i < count; i++) {
            try goalStakeV3.getParticipant(i, user) returns (
                address, uint256 stake, uint256, bool, bool, bool
            ) {
                if (stake > 0) return true;
            } catch {}
        }
        return false;
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

    function getAvailableYield() external view returns (uint256) {
        uint256 totalValue = vault.maxWithdraw(address(this));
        if (totalValue <= totalActiveStakes) return 0;
        return totalValue - totalActiveStakes;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    function claimYield() external onlyOwner {
        uint256 totalValue = vault.maxWithdraw(address(this));
        if (totalValue <= totalActiveStakes) revert NoYieldAvailable();
        uint256 yieldAmount = totalValue - totalActiveStakes;
        uint256 shares = vault.withdraw(yieldAmount, treasury, address(this));
        emit WithdrawnFromVault(yieldAmount, shares);
        emit YieldClaimed(yieldAmount);
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

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
