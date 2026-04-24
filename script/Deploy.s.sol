// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Auction.sol";

contract DeployAuction is Script {
    function run() external returns (Auction) {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        Auction auction = new Auction();

        vm.stopBroadcast();

        console.log("Auction deployed at:", address(auction));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);

        return auction;
    }
}
