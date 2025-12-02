// SPDX-License-Identifier: MIT
    pragma solidity ^0.8.20;

    import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
    import "@openzeppelin/contracts/access/Ownable.sol";

    contract POAPCredential is ERC721, Ownable {
        uint256 private _tokenIdCounter;
        
        struct Attendance {
            bytes32 eventHash;
            uint256 checkInTime;
            string geoLocation;
            bool isValid;
        }
        
        mapping(uint256 => Attendance) public attendanceRecords;
        mapping(address => bytes32[]) public studentAttendance;
        mapping(address => mapping(bytes32 => bool)) public hasAttended;
        
        event POAPMinted(uint256 indexed tokenId, address indexed student, bytes32 eventHash, uint256 checkInTime);
        event AttendanceRevoked(uint256 indexed tokenId);
        
        constructor() ERC721("Event Attendance POAP", "POAP") Ownable(msg.sender) {}
        
        function mintPOAP(address studentWallet, bytes32 eventHash, string memory geoLocation) public onlyOwner returns (uint256) {
            require(studentWallet != address(0), "Invalid wallet");
            require(!hasAttended[studentWallet][eventHash], "Already received POAP");
            
            _tokenIdCounter++;
            uint256 tokenId = _tokenIdCounter;
            
            _safeMint(studentWallet, tokenId);
            
            attendanceRecords[tokenId] = Attendance({
                eventHash: eventHash,
                checkInTime: block.timestamp,
                geoLocation: geoLocation,
                isValid: true
            });
            
            studentAttendance[studentWallet].push(eventHash);
            hasAttended[studentWallet][eventHash] = true;
            
            emit POAPMinted(tokenId, studentWallet, eventHash, block.timestamp);
            return tokenId;
        }
        
        function revokeAttendance(uint256 tokenId) public onlyOwner {
            attendanceRecords[tokenId].isValid = false;
            emit AttendanceRevoked(tokenId);
        }

        // Soulbound Logic: Block transfers
        function transferFrom(address, address, uint256) public pure override {
            revert("POAP is Soulbound");
        }
        
        function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
            revert("POAP is Soulbound");
        }
    }