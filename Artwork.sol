pragma solidity ^0.8.0;


// ArtworkInterface

contract ArtworkInterface{
    
    // State Variables
    string artName;
    string ownerName;
    address owner;
    bytes32 hash;
    uint artType;
    string url;
    uint registeredOn;
    
    // Events
    event VerifyOwner(string _result);
    event VerifyArt(string _result);
    event OwnershipTransfered(address _prev, address _new);
    event GetArtwork(
            string _artName,
            string _ownerName,
            address _owner,
            bytes32 _hash,
            uint _artType,
            string _url,
            uint _registeredOn
            );
    
    // Constructor 
    constructor (
        string memory _artName,
        string memory _ownerName,
        address _owner,
        bytes32 _hash,
        uint _artType,
        string memory _url
        ) {
        artName = _artName;
        ownerName = _ownerName;
        owner = _owner;
        hash = _hash;
        artType = _artType;
        url = _url;
        registeredOn = block.timestamp;
    }
    
    modifier onlyOwner  {
        require(msg.sender == owner, "You are not the owner");
        _;
    }
    
    function checkOwner(address _owner) public {
        require(_owner == owner, "Not the owner");
        emit VerifyOwner("Verified");
    }
    
    function checkArtwork(string memory _art) public {
        require(keccak256(abi.encode(_art)) == hash, "This contract is not for above mentioned art");
        emit VerifyArt("Verified");
        
    }
    
    function transferOwnership(address _owner) public onlyOwner{
        owner = _owner;
        emit OwnershipTransfered(msg.sender, owner);
    }
    
    function getArtwork() public{
        emit GetArtwork(artName, ownerName, owner, hash, artType, url, registeredOn);
    }
    
    
}



// ArtworkManager


contract ArtworkManager {
    
    // State Variables
    mapping(address => ArtworkInterface[]) userArt;
    mapping(bytes32 => address) artOwners;
    
    // Events
    event NewArtRegistration(address, string);
    event ArtRegistered(address _artAdrs, address _owner, string _art);
    
    // Modifiers
    modifier checkIfRegistered(string memory _art){
        require(artOwners[keccak256(abi.encode(_art))]==address(0), "Already Registered");
        _;
    }
    
    // Functions
    function registerArtwork(string memory _art ,string memory _artUrl, string memory _owner, uint _type) public checkIfRegistered(_artUrl) {
        emit NewArtRegistration(msg.sender, _artUrl);
        bytes32 hash = keccak256(abi.encode(_artUrl));
        ArtworkInterface art = new ArtworkInterface(_art,
        _owner,
        msg.sender,
        hash,
        _type,
        _artUrl);
        userArt[msg.sender].push(art);
        artOwners[hash] = msg.sender;
        emit ArtRegistered(address(art), msg.sender, _art);
    }
    
    function getArtworkByOwner(address _owner) public view returns(ArtworkInterface[] memory) {
        return userArt[_owner];
    }
    
    function getOwnerByArtwork(string memory _art) public view returns(address _owner){
        return artOwners[keccak256(abi.encode(_art))];
    }
    
    function isRegistered(string memory _art) public view checkIfRegistered(_art){}
}
