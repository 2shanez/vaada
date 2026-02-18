// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VaadaReceipts
 * @notice Soulbound (non-transferable) onchain proof of commitment
 * @dev ERC-721 with transfers disabled. Each token represents a completed goal.
 *      "Shane ran 20 miles, Feb 2026. Verified by Strava. Settled onchain."
 *      Your fitness diploma that nobody can fake or revoke.
 */
contract VaadaReceipts {
    // ============ ERC-721 Core ============
    
    string public name = "Vaada Receipts";
    string public symbol = "VAADA";
    
    uint256 public totalSupply;
    address public owner;
    address public minter; // Backend verifier that mints after settlement
    
    // ============ Receipt Data ============
    
    struct Receipt {
        uint256 goalId;        // VaadaV3 goal ID
        address participant;   // Who made the commitment
        uint8 goalType;        // 0 = STRAVA_MILES, 1 = FITBIT_STEPS
        uint256 target;        // What they committed to
        uint256 actual;        // What they achieved
        uint256 stakeAmount;   // How much they put on the line (USDC, 6 decimals)
        uint256 payout;        // What they received back (0 if lost)
        bool succeeded;        // Did they keep their promise?
        uint256 startTime;     // When the goal started
        uint256 endTime;       // When the goal ended
        uint256 mintedAt;      // When the receipt was minted
        string goalName;       // e.g., "Run 20 Miles"
    }
    
    // Token ID => Receipt
    mapping(uint256 => Receipt) public receipts;
    
    // Token ID => Owner
    mapping(uint256 => address) private _owners;
    
    // Owner => Token count
    mapping(address => uint256) private _balances;
    
    // Owner => list of token IDs
    mapping(address => uint256[]) private _ownedTokens;
    
    // Prevent duplicate mints: goalId => participant => tokenId (0 means not minted)
    mapping(uint256 => mapping(address => uint256)) public receiptForGoal;
    
    // ============ Wallet Reputation (computed views) ============
    
    // Track aggregate stats per wallet for easy querying
    mapping(address => uint256) public goalsAttempted;
    mapping(address => uint256) public goalsCompleted;
    mapping(address => uint256) public totalStakedLifetime; // cumulative USDC staked
    mapping(address => uint256) public totalEarnedLifetime;  // cumulative USDC earned
    mapping(address => uint256) public currentStreak;
    mapping(address => uint256) public longestStreak;
    
    // ============ Events ============
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event ReceiptMinted(
        uint256 indexed tokenId,
        uint256 indexed goalId,
        address indexed participant,
        bool succeeded,
        uint256 target,
        uint256 actual
    );
    
    // ============ Errors ============
    
    error NotOwner();
    error NotMinter();
    error SoulboundTransferDisabled();
    error AlreadyMinted();
    error TokenDoesNotExist();
    
    // ============ Constructor ============
    
    constructor(address _minter) {
        owner = msg.sender;
        minter = _minter;
    }
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyMinter() {
        if (msg.sender != minter && msg.sender != owner) revert NotMinter();
        _;
    }
    
    // ============ Mint ============
    
    /**
     * @notice Input struct for minting (avoids stack-too-deep)
     */
    struct MintInput {
        uint256 goalId;
        address participant;
        uint8 goalType;
        uint256 target;
        uint256 actual;
        uint256 stakeAmount;
        uint256 payout;
        bool succeeded;
        uint256 startTime;
        uint256 endTime;
        string goalName;
    }

    /**
     * @notice Mint a single receipt
     */
    function mintReceipt(MintInput calldata inp) external onlyMinter returns (uint256 tokenId) {
        if (receiptForGoal[inp.goalId][inp.participant] != 0) revert AlreadyMinted();
        tokenId = _mint(inp);
    }

    /**
     * @notice Batch mint receipts for all participants in a settled goal
     */
    function batchMintReceipts(MintInput[] calldata inputs) external onlyMinter {
        for (uint256 i = 0; i < inputs.length; i++) {
            if (receiptForGoal[inputs[i].goalId][inputs[i].participant] != 0) continue;
            _mint(inputs[i]);
        }
    }

    /**
     * @dev Internal mint logic
     */
    function _mint(MintInput calldata inp) internal returns (uint256 tokenId) {
        totalSupply++;
        tokenId = totalSupply;
        
        receipts[tokenId] = Receipt({
            goalId: inp.goalId,
            participant: inp.participant,
            goalType: inp.goalType,
            target: inp.target,
            actual: inp.actual,
            stakeAmount: inp.stakeAmount,
            payout: inp.payout,
            succeeded: inp.succeeded,
            startTime: inp.startTime,
            endTime: inp.endTime,
            mintedAt: block.timestamp,
            goalName: inp.goalName
        });
        
        _owners[tokenId] = inp.participant;
        _balances[inp.participant]++;
        _ownedTokens[inp.participant].push(tokenId);
        receiptForGoal[inp.goalId][inp.participant] = tokenId;
        
        // Update reputation stats
        goalsAttempted[inp.participant]++;
        totalStakedLifetime[inp.participant] += inp.stakeAmount;
        
        if (inp.succeeded) {
            goalsCompleted[inp.participant]++;
            totalEarnedLifetime[inp.participant] += inp.payout;
            currentStreak[inp.participant]++;
            if (currentStreak[inp.participant] > longestStreak[inp.participant]) {
                longestStreak[inp.participant] = currentStreak[inp.participant];
            }
        } else {
            currentStreak[inp.participant] = 0;
        }
        
        emit Transfer(address(0), inp.participant, tokenId);
        emit ReceiptMinted(tokenId, inp.goalId, inp.participant, inp.succeeded, inp.target, inp.actual);
    }
    
    // ============ ERC-721 Views ============
    
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert TokenDoesNotExist();
        return tokenOwner;
    }
    
    /**
     * @notice Get all token IDs owned by an address
     */
    function tokensOf(address account) external view returns (uint256[] memory) {
        return _ownedTokens[account];
    }
    
    /**
     * @notice Get full receipt data for a token
     */
    function getReceipt(uint256 tokenId) external view returns (Receipt memory) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
        return receipts[tokenId];
    }
    
    /**
     * @notice Get all receipts for a wallet (full reputation view)
     */
    function getWalletReceipts(address account) external view returns (Receipt[] memory) {
        uint256[] memory tokenIds = _ownedTokens[account];
        Receipt[] memory result = new Receipt[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            result[i] = receipts[tokenIds[i]];
        }
        return result;
    }
    
    /**
     * @notice Get wallet reputation summary
     * @return attempted Total goals attempted
     * @return completed Total goals completed  
     * @return winRate Win rate in basis points (10000 = 100%)
     * @return totalStaked Lifetime USDC staked
     * @return totalEarned Lifetime USDC earned
     * @return streak Current win streak
     * @return bestStreak Longest win streak ever
     */
    function getReputation(address account) external view returns (
        uint256 attempted,
        uint256 completed,
        uint256 winRate,
        uint256 totalStaked,
        uint256 totalEarned,
        uint256 streak,
        uint256 bestStreak
    ) {
        attempted = goalsAttempted[account];
        completed = goalsCompleted[account];
        winRate = attempted > 0 ? (completed * 10000) / attempted : 0;
        totalStaked = totalStakedLifetime[account];
        totalEarned = totalEarnedLifetime[account];
        streak = currentStreak[account];
        bestStreak = longestStreak[account];
    }
    
    // ============ Soulbound: Transfers Disabled ============
    
    function transferFrom(address, address, uint256) external pure {
        revert SoulboundTransferDisabled();
    }
    
    function safeTransferFrom(address, address, uint256) external pure {
        revert SoulboundTransferDisabled();
    }
    
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert SoulboundTransferDisabled();
    }
    
    function approve(address, uint256) external pure {
        revert SoulboundTransferDisabled();
    }
    
    function setApprovalForAll(address, bool) external pure {
        revert SoulboundTransferDisabled();
    }
    
    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }
    
    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }
    
    // ============ Metadata ============
    
    // Base URI for metadata (set to your API endpoint)
    string public baseURI;
    
    /**
     * @notice Returns metadata URI for a token
     * @dev Points to API: baseURI + tokenId. All receipt data is onchain
     *      via getReceipt() — the API just formats it as JSON for marketplaces.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
        return string(abi.encodePacked(baseURI, _toString(tokenId)));
    }
    
    function setBaseURI(string calldata _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }
    
    /**
     * @notice ERC-165 interface support
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x5b5e139f;   // ERC-721 Metadata
    }
    
    // ============ Admin ============
    
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    // ============ Internal Helpers ============
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
