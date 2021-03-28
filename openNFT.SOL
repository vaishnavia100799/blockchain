pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import "@openzeppelin/contracts/utils/Counters.sol";
import '@openzeppelin/contracts/access/Ownable.sol';

contract OpenNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter public tokenId;

    string private baseUri;

    event NFTInitialised(uint _time, address _caller);

    event NftTokenCreated(address creator, uint tokenId, string tokenUri);
    
    mapping(uint => string) private tokenURIs;

    mapping(address => uint[]) private user_to_tokens;  //new

    mapping(string => uint8) private hash_to_isExiting;
    mapping(uint => address) private token_to_creator;
    mapping(uint => string) private token_to_caption;

    constructor (
        string memory _name,
        string memory _symbol
    ) 
    public 
    ERC721(_name, _symbol)
    {
        setBaseUrl('https://ipfs.infura.io/ipfs/');
        emit NFTInitialised(block.timestamp, msg.sender);
    }

    function createNFT(
        address _creator,
        string memory _tokenURI,
        string memory _caption
    ) 
                                    public returns(uint _reward) {
        require(hash_to_isExiting[_tokenURI]!=1, "NFT already created");
        tokenId.increment();

        uint newTokenId = tokenId.current();

        tokenURIs[newTokenId] = _tokenURI;
        user_to_tokens[_creator].push(newTokenId);  //new
        hash_to_isExiting[_tokenURI] = 1;
        token_to_creator[newTokenId] = _creator;
        token_to_caption[newTokenId] = _caption;

        _mint(_creator, newTokenId);

        emit NftTokenCreated(_creator, newTokenId, tokenURIs[newTokenId]);

        return 1;
    }

    function getUserNFTs(address _creator) public 
                                view returns(uint[] memory _tokens) {
        return user_to_tokens[_creator];
    }

    function getTokenUri(uint _tokenId) public 
                                view returns(string memory tokenUri_){
        return tokenURIs[_tokenId];
    }

    function getCreator(uint _tokenId) public
                                view returns(address creator) {
        return token_to_creator[_tokenId];
    }

    function getCaption(uint _tokenId) public
                                view returns(string memory caption){
        return token_to_caption[_tokenId];
    }

    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory _uri) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, tokenURIs[_tokenId]))
            : '';
    }

    function setBaseUrl(string memory baseUri_) public onlyOwner {
        baseUri = baseUri_;
    }

    function _baseURI() internal override view returns(string memory _base_URI){
        return baseUri;
    }

    fallback () external {
        revert();
    }

}
