// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GoalStakeAutomationV3.sol";

contract DeployAutomationV3 is Script {
    function run() external {
        // Base Mainnet Chainlink config
        address router = 0xf9B8fc078197181C841c296C876945aaa425B278; // Functions Router (Base mainnet)
        address vaadaV3 = 0x38D638CA7DC8905177507CfC74Aedc96f7A9e3f0; // VaadaV3 (just deployed)
        bytes32 donId = 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000; // fun-base-mainnet-1
        uint64 subscriptionId = 132; // Chainlink Functions subscription
        
        console.log("Deploying GoalStakeAutomationV3");
        console.log("Router:", router);
        console.log("VaadaV3:", vaadaV3);
        console.log("Subscription ID:", subscriptionId);
        
        vm.startBroadcast();
        
        GoalStakeAutomationV3 automation = new GoalStakeAutomationV3(
            router,
            vaadaV3,
            donId,
            subscriptionId
        );
        
        console.log("GoalStakeAutomationV3 deployed to:", address(automation));
        
        vm.stopBroadcast();
        
        console.log("\n=== Next Steps ===");
        console.log("1. Add this contract as consumer to Chainlink subscription 132");
        console.log("2. Call setOracle() on VaadaV3 to set this as oracle");
    }
}
