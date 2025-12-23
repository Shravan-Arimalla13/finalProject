// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title POAPCredential
 * @dev Soulbound NFT for event attendance verification
 * @notice This contract mints non-transferable attendance badges
 */
contract POAPCredential is ERC721, Ownable {
    using Strings for uint256;

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    uint256 private _tokenIdCounter;
    
    struct Attendance {
        bytes32 eventHash;          // Unique event identifier
        uint256 checkInTime;        // Timestamp of check-in
        string geoLocation;         // GPS coordinates (lat,lng)
        bool isValid;               // Revocation status
        uint8 attendanceScore;      // 100 = on-time, <100 = late
    }
    
    // Mappings
    mapping(uint256 => Attendance) public attendanceRecords;
    mapping(address => bytes32[]) public studentAttendance;
    mapping(address => mapping(bytes32 => bool)) public hasAttended;
    mapping(bytes32 => uint256) public eventAttendeeCount;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event POAPMinted(
        uint256 indexed tokenId, 
        address indexed student, 
        bytes32 indexed eventHash, 
        uint256 checkInTime,
        string geoLocation,
        uint8 attendanceScore
    );
    
    event AttendanceRevoked(
        uint256 indexed tokenId,
        address indexed student,
        bytes32 indexed eventHash,
        string reason
    );
    
    event AttendanceScoreUpdated(
        uint256 indexed tokenId,
        uint8 oldScore,
        uint8 newScore
    );
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() ERC721("Event Attendance POAP", "POAP") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }
    
    // ============================================
    // CORE FUNCTIONS
    // ============================================
    
    /**
     * @notice Mint a new POAP to verify event attendance
     * @param studentWallet The Ethereum address of the student
     * @param eventHash Unique identifier for the event
     * @param geoLocation GPS coordinates (format: "lat,lng")
     * @return tokenId The ID of the newly minted POAP
     */
    function mintPOAP(
        address studentWallet, 
        bytes32 eventHash, 
        string memory geoLocation
    ) public onlyOwner returns (uint256) {
        require(studentWallet != address(0), "Invalid wallet address");
        require(!hasAttended[studentWallet][eventHash], "POAP already claimed for this event");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        // Mint the NFT
        _safeMint(studentWallet, tokenId);
        
        // Calculate attendance score (100 = perfect, can be updated later)
        uint8 attendanceScore = 100;
        
        // Store attendance record
        attendanceRecords[tokenId] = Attendance({
            eventHash: eventHash,
            checkInTime: block.timestamp,
            geoLocation: geoLocation,
            isValid: true,
            attendanceScore: attendanceScore
        });
        
        // Update tracking mappings
        studentAttendance[studentWallet].push(eventHash);
        hasAttended[studentWallet][eventHash] = true;
        eventAttendeeCount[eventHash]++;
        
        emit POAPMinted(
            tokenId, 
            studentWallet, 
            eventHash, 
            block.timestamp,
            geoLocation,
            attendanceScore
        );
        
        return tokenId;
    }
    
    /**
     * @notice Revoke a POAP (for fraudulent check-ins)
     * @param tokenId The ID of the POAP to revoke
     */
    function revokeAttendance(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(attendanceRecords[tokenId].isValid, "Already revoked");
        
        attendanceRecords[tokenId].isValid = false;
        
        address owner = ownerOf(tokenId);
        bytes32 eventHash = attendanceRecords[tokenId].eventHash;
        
        emit AttendanceRevoked(tokenId, owner, eventHash, "Admin revocation");
    }
    
    /**
     * @notice Update attendance score (for late arrivals)
     * @param tokenId The ID of the POAP
     * @param newScore The new attendance score (0-100)
     */
    function updateAttendanceScore(uint256 tokenId, uint8 newScore) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(newScore <= 100, "Score must be 0-100");
        
        uint8 oldScore = attendanceRecords[tokenId].attendanceScore;
        attendanceRecords[tokenId].attendanceScore = newScore;
        
        emit AttendanceScoreUpdated(tokenId, oldScore, newScore);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get all POAPs for a student
     * @param student The wallet address to query
     * @return Array of event hashes the student has attended
     */
    function getStudentAttendance(address student) public view returns (bytes32[] memory) {
        return studentAttendance[student];
    }
    
    /**
     * @notice Get total attendees for an event
     * @param eventHash The event identifier
     * @return Number of unique attendees
     */
    function getEventAttendeeCount(bytes32 eventHash) public view returns (uint256) {
        return eventAttendeeCount[eventHash];
    }
    
    /**
     * @notice Check if a POAP is valid (not revoked)
     * @param tokenId The POAP token ID
     * @return True if valid, false if revoked
     */
    function isAttendanceValid(uint256 tokenId) public view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return attendanceRecords[tokenId].isValid;
    }
    
    /**
     * @notice Get full attendance record for a token
     * @param tokenId The POAP token ID
     * @return eventHash Unique event identifier
     * @return checkInTime Timestamp of check-in
     * @return geoLocation GPS coordinates
     * @return isValid Revocation status
     * @return attendanceScore Score from 0-100
     */
    function getAttendanceRecord(uint256 tokenId) public view returns (
        bytes32 eventHash,
        uint256 checkInTime,
        string memory geoLocation,
        bool isValid,
        uint8 attendanceScore
    ) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        Attendance memory record = attendanceRecords[tokenId];
        return (
            record.eventHash,
            record.checkInTime,
            record.geoLocation,
            record.isValid,
            record.attendanceScore
        );
    }
    
    /**
     * @notice Get current token counter
     * @return The next token ID to be minted
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    // ============================================
    // SOULBOUND LOGIC (Non-Transferable)
    // ============================================
    
    /**
     * @dev Override transfer to make tokens soulbound
     * @notice POAPs cannot be transferred between wallets
     */
    function transferFrom(
        address /* from */, 
        address /* to */, 
        uint256 /* tokenId */
    ) public pure override {
        revert("POAP is Soulbound and cannot be transferred");
    }
    
    /**
     * @dev Override safeTransfer to make tokens soulbound
     */
    function safeTransferFrom(
        address /* from */, 
        address /* to */, 
        uint256 /* tokenId */, 
        bytes memory /* data */
    ) public pure override {
        revert("POAP is Soulbound and cannot be transferred");
    }
    
    // ============================================
    // METADATA (Optional)
    // ============================================
    
    /**
     * @dev Returns the token URI (can be customized for IPFS metadata)
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        // You can customize this to return IPFS metadata
        // For now, returns a simple JSON structure
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    bytes(
                        string(
                            abi.encodePacked(
                                '{"name":"Attendance Badge #',
                                tokenId.toString(),
                                '","description":"Verified event attendance POAP",',
                                '"image":"https://your-domain.com/poap-badge.png"}'
                            )
                        )
                    )
                )
            )
        );
    }
}

// ============================================
// BASE64 ENCODING LIBRARY
// ============================================

library Base64 {
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = TABLE;
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            
            for {
                let dataPtr := data
                let endPtr := add(data, mload(data))
            } lt(dataPtr, endPtr) {
            
            } {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            
            mstore(result, encodedLen)
        }
        
        return result;
    }
}