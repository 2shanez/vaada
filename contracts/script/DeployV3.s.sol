// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {GoalStakeV3} from "../src/GoalStakeV3.sol";

contract DeployV3Script is Script {
    // Base Sepolia USDC
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Existing automation contract (will be the oracle)
    address constant AUTOMATION = 0x8E69bf57b08992204317584b5e906c1B6e6E609E;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("USDC:", USDC);
        console.log("Oracle (Automation):", AUTOMATION);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy GoalStakeV3 with automation as oracle
        GoalStakeV3 goalStake = new GoalStakeV3(USDC, AUTOMATION);
        console.log("GoalStakeV3 deployed to:", address(goalStake));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("GoalStakeV3:", address(goalStake));
        console.log("Oracle:", AUTOMATION);
        console.log("USDC:", USDC);
        console.log("\nNext: Update automation contract to point to this new GoalStakeV3");
    }
}
