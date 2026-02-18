// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VaadaReceipts.sol";

contract DeployReceipts is Script {
    function run() external {
        // Minter = deployer wallet (will call mintReceipt from backend)
        address minter = vm.envAddress("DEPLOYER_ADDRESS");
        
        vm.startBroadcast();
        
        VaadaReceipts receipts = new VaadaReceipts(minter);
        
        console.log("VaadaReceipts deployed at:", address(receipts));
        console.log("Owner:", receipts.owner());
        console.log("Minter:", receipts.minter());
        
        vm.stopBroadcast();
    }
}
