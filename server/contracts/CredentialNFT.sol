// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CredentialNFT (Soulbound)
 * @dev ERC-1155 Token where transfers are blocked.
 * Only Minting and Burning (Revocation) are allowed.
 */
contract CredentialNFT is ERC1155, Ownable {
    
    uint256 public tokenIdCounter;
    mapping(uint256 => bytes32) public tokenHashes;
    mapping(bytes32 => bool) public revokedHashes;

    event CertificateMinted(uint256 indexed tokenId, bytes32 certHash, address indexed studentWallet);
    event CertificateRevoked(uint256 indexed tokenId, bytes32 certHash);

    constructor() ERC1155("https://api.mycollege.com/nft/{id}.json") Ownable(msg.sender) {
        tokenIdCounter = 0;
    }

    function mintCertificate(address studentWallet, bytes32 certHash) public onlyOwner {
        require(!revokedHashes[certHash], "This hash is revoked.");
        tokenIdCounter++;
        uint256 newTokenId = tokenIdCounter;
        tokenHashes[newTokenId] = certHash;
        _mint(studentWallet, newTokenId, 1, "");
        emit CertificateMinted(newTokenId, certHash, studentWallet);
    }

    function revokeCertificateByHash(bytes32 certHash) public onlyOwner {
        revokedHashes[certHash] = true;
        // Ideally we would burn the token here, but we need the tokenId to do that efficiently.
        // For now, flagging the hash as revoked effectively kills the validity.
    }

    function isHashValid(bytes32 certHash) public view returns (bool) {
        return !revokedHashes[certHash];
    }

    // --- SOULBOUND LOGIC: BLOCK TRANSFERS ---
    /**
     * @dev Hook that is called before any token transfer. 
     * We override this to BLOCK all transfers unless it is Minting or Burning.
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual override {
        // Allow Minting (from 0x0)
        // Allow Burning (to 0x0)
        // BLOCK everything else (Student -> Student)
        require(
            from == address(0) || to == address(0),
            "Soulbound: This certificate cannot be transferred."
        );
        
        super._update(from, to, ids, values);
    }
}