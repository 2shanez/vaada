// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {GoalStake} from "../src/GoalStake.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title MockUSDC
 * @notice Simple ERC20 mock for testing
 */
contract MockUSDC is IERC20 {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract GoalStakeTest is Test {
    GoalStake public goalStake;
    MockUSDC public usdc;
    
    address public owner = address(this);
    address public oracle = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);
    
    uint256 constant ONE_MILE = 1e18;
    uint256 constant STAKE_100 = 100e6; // 100 USDC
    uint256 constant ONE_WEEK = 7 days;
    
    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy GoalStake
        goalStake = new GoalStake(address(usdc), oracle);
        
        // Mint USDC to test users
        usdc.mint(alice, 10000e6); // 10,000 USDC
        usdc.mint(bob, 10000e6);
        
        // Approve GoalStake to spend USDC
        vm.prank(alice);
        usdc.approve(address(goalStake), type(uint256).max);
        
        vm.prank(bob);
        usdc.approve(address(goalStake), type(uint256).max);
    }
    
    // ============ Challenge Creation Tests ============
    
    function test_CreateChallenge() public {
        vm.prank(alice);
        uint256 challengeId = goalStake.createChallenge(
            20 * ONE_MILE,  // 20 miles
            STAKE_100,       // 100 USDC
            ONE_WEEK        // 1 week
        );
        
        assertEq(challengeId, 0);
        
        GoalStake.Challenge memory challenge = goalStake.getChallenge(0);
        assertEq(challenge.user, alice);
        assertEq(challenge.targetMiles, 20 * ONE_MILE);
        assertEq(challenge.stakeAmount, STAKE_100);
        assertEq(challenge.settled, false);
        assertEq(challenge.success, false);
        
        // Check USDC was transferred
        assertEq(usdc.balanceOf(address(goalStake)), STAKE_100);
        assertEq(usdc.balanceOf(alice), 10000e6 - STAKE_100);
    }
    
    function test_CreateChallenge_RevertIfStakeTooLow() public {
        vm.prank(alice);
        vm.expectRevert("Stake too low");
        goalStake.createChallenge(20 * ONE_MILE, 5e6, ONE_WEEK); // 5 USDC < min
    }
    
    function test_CreateChallenge_RevertIfStakeTooHigh() public {
        vm.prank(alice);
        vm.expectRevert("Stake too high");
        goalStake.createChallenge(20 * ONE_MILE, 2000e6, ONE_WEEK); // 2000 USDC > max
    }
    
    function test_CreateChallenge_RevertIfDurationTooShort() public {
        vm.prank(alice);
        vm.expectRevert("Duration too short");
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, 1 hours);
    }
    
    function test_CreateChallenge_RevertIfDurationTooLong() public {
        vm.prank(alice);
        vm.expectRevert("Duration too long");
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, 365 days);
    }
    
    // ============ Verification & Settlement Tests ============
    
    function test_VerifyChallenge_Success() public {
        // Alice creates challenge: 20 miles in 1 week
        vm.prank(alice);
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, ONE_WEEK);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + ONE_WEEK + 1);
        
        // Oracle verifies: Alice ran 25 miles (success!)
        vm.prank(oracle);
        goalStake.verifyChallenge(0, 25 * ONE_MILE);
        
        GoalStake.Challenge memory challenge = goalStake.getChallenge(0);
        assertEq(challenge.actualMiles, 25 * ONE_MILE);
        assertEq(challenge.success, true);
        assertEq(challenge.settled, true);
        
        // Alice gets her stake back
        assertEq(usdc.balanceOf(alice), 10000e6); // Back to original
    }
    
    function test_VerifyChallenge_Failure() public {
        // Alice creates challenge: 20 miles in 1 week
        vm.prank(alice);
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, ONE_WEEK);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + ONE_WEEK + 1);
        
        // Oracle verifies: Alice only ran 15 miles (failure!)
        vm.prank(oracle);
        goalStake.verifyChallenge(0, 15 * ONE_MILE);
        
        GoalStake.Challenge memory challenge = goalStake.getChallenge(0);
        assertEq(challenge.actualMiles, 15 * ONE_MILE);
        assertEq(challenge.success, false);
        assertEq(challenge.settled, true);
        
        // Alice loses her stake
        assertEq(usdc.balanceOf(alice), 10000e6 - STAKE_100);
        
        // Loser pool increases
        assertEq(goalStake.getLoserPool(), STAKE_100);
    }
    
    function test_VerifyChallenge_WinnerGetsBonus() public {
        // Bob fails first, adding to loser pool
        vm.prank(bob);
        goalStake.createChallenge(50 * ONE_MILE, STAKE_100, ONE_WEEK);
        
        vm.warp(block.timestamp + ONE_WEEK + 1);
        
        vm.prank(oracle);
        goalStake.verifyChallenge(0, 10 * ONE_MILE); // Bob fails
        
        assertEq(goalStake.getLoserPool(), STAKE_100);
        
        // Reset time for Alice's challenge
        vm.warp(block.timestamp + 1);
        
        // Alice creates and wins
        vm.prank(alice);
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, ONE_WEEK);
        
        vm.warp(block.timestamp + ONE_WEEK + 1);
        
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);
        
        vm.prank(oracle);
        goalStake.verifyChallenge(1, 25 * ONE_MILE); // Alice wins
        
        // Alice gets stake + 10% of loser pool
        uint256 expectedBonus = STAKE_100 / 10; // 10 USDC
        assertEq(usdc.balanceOf(alice), aliceBalanceBefore + STAKE_100 + expectedBonus);
    }
    
    function test_VerifyChallenge_RevertIfNotOracle() public {
        vm.prank(alice);
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, ONE_WEEK);
        
        vm.warp(block.timestamp + ONE_WEEK + 1);
        
        vm.prank(alice); // Not oracle!
        vm.expectRevert("Not oracle");
        goalStake.verifyChallenge(0, 25 * ONE_MILE);
    }
    
    function test_VerifyChallenge_RevertIfBeforeDeadline() public {
        vm.prank(alice);
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, ONE_WEEK);
        
        // Don't warp - still before deadline
        vm.prank(oracle);
        vm.expectRevert("Not yet deadline");
        goalStake.verifyChallenge(0, 25 * ONE_MILE);
    }
    
    function test_VerifyChallenge_RevertIfAlreadySettled() public {
        vm.prank(alice);
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, ONE_WEEK);
        
        vm.warp(block.timestamp + ONE_WEEK + 1);
        
        vm.prank(oracle);
        goalStake.verifyChallenge(0, 25 * ONE_MILE);
        
        // Try to verify again
        vm.prank(oracle);
        vm.expectRevert("Already settled");
        goalStake.verifyChallenge(0, 30 * ONE_MILE);
    }
    
    // ============ View Function Tests ============
    
    function test_GetUserChallenges() public {
        vm.startPrank(alice);
        goalStake.createChallenge(10 * ONE_MILE, STAKE_100, ONE_WEEK);
        goalStake.createChallenge(20 * ONE_MILE, STAKE_100, ONE_WEEK);
        goalStake.createChallenge(30 * ONE_MILE, STAKE_100, ONE_WEEK);
        vm.stopPrank();
        
        uint256[] memory challenges = goalStake.getUserChallenges(alice);
        assertEq(challenges.length, 3);
        assertEq(challenges[0], 0);
        assertEq(challenges[1], 1);
        assertEq(challenges[2], 2);
    }
    
    // ============ Admin Function Tests ============
    
    function test_SetOracle() public {
        address newOracle = address(0x999);
        goalStake.setOracle(newOracle);
        assertEq(goalStake.oracle(), newOracle);
    }
    
    function test_SetOracle_RevertIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("Not owner");
        goalStake.setOracle(address(0x999));
    }
    
    function test_SetStakeLimits() public {
        goalStake.setStakeLimits(50e6, 500e6);
        assertEq(goalStake.minStake(), 50e6);
        assertEq(goalStake.maxStake(), 500e6);
    }
}
