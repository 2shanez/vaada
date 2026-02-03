// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GoalStakeAutomationV3.sol";

contract DeployAutomationV3 is Script {
    function run() external {
        // Base Sepolia Chainlink config
        address router = 0xf9B8fc078197181C841c296C876945aaa425B278; // Functions Router
        address goalStakeV3 = 0x13b8eaEb7F7927527CE1fe7A600f05e61736d217; // GoalStakeV3
        bytes32 donId = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000; // fun-base-sepolia-1
        uint64 subscriptionId = 561; // Your Chainlink Functions subscription
        
        vm.startBroadcast();
        
        GoalStakeAutomationV3 automation = new GoalStakeAutomationV3(
            router,
            goalStakeV3,
            donId,
            subscriptionId
        );
        
        console.log("GoalStakeAutomationV3 deployed to:", address(automation));
        
        vm.stopBroadcast();
    }
}
