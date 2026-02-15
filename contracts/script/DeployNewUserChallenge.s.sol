// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {NewUserChallenge} from "../src/NewUserChallenge.sol";

contract DeployNewUserChallenge is Script {
    // Base Mainnet addresses
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant MORPHO_VAULT = 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61;
    address constant GOAL_STAKE_V3 = 0xAc67E863221B703CEE9B440a7beFe71EA8725434;
    address constant FUNCTIONS_ROUTER = 0xf9b8fc078197181c841c296c876945aaa425b278;
    bytes32 constant DON_ID = 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000;
    
    // Chainlink Functions subscription ID
    uint64 constant SUBSCRIPTION_ID = 132;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying NewUserChallenge...");
        console.log("Deployer:", deployer);
        console.log("Treasury:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        NewUserChallenge challenge = new NewUserChallenge(
            USDC,
            MORPHO_VAULT,
            GOAL_STAKE_V3,
            deployer,          // treasury
            FUNCTIONS_ROUTER,
            DON_ID,
            SUBSCRIPTION_ID
        );

        console.log("NewUserChallenge deployed at:", address(challenge));

        vm.stopBroadcast();
    }
}
