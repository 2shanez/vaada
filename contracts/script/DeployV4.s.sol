// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VaadaV4.sol";

contract DeployV4 is Script {
    function run() external {
        // Base mainnet addresses
        address usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        address morphoVault = 0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61; // Gauntlet USDC Prime
        address oracle = msg.sender; // Owner acts as oracle initially
        address treasury = msg.sender; // Owner is treasury initially

        vm.startBroadcast();
        VaadaV4 vaada = new VaadaV4(usdc, morphoVault, oracle, treasury);
        vm.stopBroadcast();

        console.log("VaadaV4 deployed to:", address(vaada));
        console.log("Owner/Oracle/Treasury:", msg.sender);
        console.log("Platform fee: 10% (1000 bps)");
    }
}
