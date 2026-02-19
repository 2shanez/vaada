// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/NewUserChallengeV4.sol";

contract DeployNUCV4 is Script {
    function run() external {
        // Base mainnet addresses
        address usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        address morphoVault = 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61; // Gauntlet USDC Prime
        address goalStakeV3 = 0xAc67E863221B703CEE9B440a7beFe71EA8725434;
        address treasury = 0xBf16F926d7732B22d4AaA9177b71AB7ba3159640; // deployer wallet

        vm.startBroadcast();
        NewUserChallengeV4 nuc = new NewUserChallengeV4(
            usdc,
            morphoVault,
            goalStakeV3,
            treasury
        );
        vm.stopBroadcast();

        console.log("NewUserChallengeV4 deployed at:", address(nuc));
    }
}
