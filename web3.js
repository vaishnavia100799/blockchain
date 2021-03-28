import Web3 from "web3";

const getWeb3 = () =>
  new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    window.addEventListener("load", async () => {
      // Modern dapp browsers...
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          // Request account access if needed
          await window.ethereum.enable();
          // Acccounts now exposed
          resolve(web3);
        } catch (error) {
          reject(error);
        }
      }
      // Legacy dapp browsers...
      else if (window.web3) {
        // Use Mist/MetaMask's provider.
        const web3 = window.web3;
        console.log("Injected web3 detected.");
        resolve(web3);
      }
      // Fallback to localhost; use dev console port by default...
      else {
        const provider = new Web3.providers.HttpProvider(
          "http://127.0.0.1:8545"
        );
        const web3 = new Web3(provider);
        console.log("No web3 instance injected, using Local web3.");
        resolve(web3);
      }
    });
  });

export default getWeb3;






/// App.js


import React, { Component, useState } from "react";
import "./App.css";
import OpenNFTContract from "./contracts/OpenNFT.json";
import NobelMainContract from "./contracts/NobelMain.json";
import NobelTokenContract from "./contracts/NobelToken.json";
import getWeb3 from "./getWeb3";
import Web3 from 'web3';
import imageCompression from 'browser-image-compression';

import ipfsClient from 'ipfs-http-client';
const ipfs = ipfsClient('https://ipfs.infura.io:5001');



class App extends Component {
  state = { isLoaded: false, litters: [], refresh: false, currentAccount: '0x00000000000000000000' };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      this.web3 = await getWeb3();
      // this.web3 = await new Web3("https://rinkeby.infura.io/v3/ca2f217cd62c4f8081cbfa6f236b609a");

      this.gas = 3000000;
      this.gasPrice = this.web3.utils.toWei('2','Gwei');
      console.log(this.gasPrice);

      // Use web3 to get the user's accounts.
      this.accounts = await this.web3.eth.getAccounts();
      setInterval(
        async ()=>{
          this.accounts = await this.web3.eth.getAccounts();
          if(this.state.currentAccount !== this.accounts[0]){
            this.setState({currentAccount: this.accounts[0]});
          }
          this.fetchUserStats(this.accounts[0]);
        }, 1000
      )

      // Get the contract instance.
      this.networkId = await this.web3.eth.net.getId();

      const OpenNFTNetwork = OpenNFTContract.networks[this.networkId];
      this.OpenNFTInstance = new this.web3.eth.Contract(
        OpenNFTContract.abi,
        OpenNFTNetwork && OpenNFTNetwork.address,
      );

      const NodeMainNetwork = NobelMainContract.networks[this.networkId];
      this.NodeMainInstance = new this.web3.eth.Contract(
        NobelMainContract.abi,
        NodeMainNetwork && NodeMainNetwork.address,
      );

      this.fetchUserStats(this.accounts[0]);

      this.fetchTokenIds();

      this.initialiseNobelTokenContract();

      this.listenToNftCreation();

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      if(this.web3){
        this.setState({ isLoaded: true, currentAccount: this.accounts[0]});
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  giftReward = async (creator) => {
    const currentAccount = this.state.currentAccount;
    const balance = await this.NobelTokenInstance.methods.balanceOf(this.state.currentAccount).call();
    console.log(balance);
    if(balance<1){
      alert("Sorry, you don't have enough Nobel Token Balance. Earn Nobel tokens by destroying some Litter.");
      return;
    }
    return await this.NobelTokenInstance.methods.transfer(creator, 1).send({
      from: currentAccount,
      gas: this.gas,
      gasPrice: this.gasPrice
    }).on('receipt',(receipt)=>true)
      .on('error', (error)=>false);
  }

  initialiseNobelTokenContract = async () => {
    const NobelTokenAddress = await this.NodeMainInstance.methods.getNobelsContractAddress().call();
    console.log({NobelTokenAddress});
      this.NobelTokenInstance = new this.web3.eth.Contract(
        NobelTokenContract.abi,
        NobelTokenAddress
      );
  }

  fetchTokenIds = async () => {
    const litters = this.state.litters;
    const CurrentTokenId = await this.OpenNFTInstance.methods.tokenId().call();
    for(let i = 1; i<=CurrentTokenId; i++){
      const tokenUri = await this.OpenNFTInstance.methods.getTokenUri(i).call();
      const creator = await this.OpenNFTInstance.methods.getTokenCreator(i).call();
      const caption = await this.OpenNFTInstance.methods.getTokenCaption(i).call();
      const tokenId = i;
      litters.unshift({tokenUri, tokenId, creator, caption });
    };
    this.setState({litters: litters});
  }

  listenToNftCreation = async () => {
    this.OpenNFTInstance.events.NftTokenCreated()
            .on('data',
                  (receipt)=>{
                    const {creator, tokenId, tokenUri, caption} = receipt.returnValues
                    const litter = {creator, tokenId, tokenUri, caption};
                    const litters = this.state.litters;
                    litters.unshift(litter);
                    this.setState({litters: litters});
                  }
              )
  }

  fetchUserStats = async (account) => {
    const litterBalance = await this.NodeMainInstance
                          .methods.getBalanceOfLitter(account).call();
    const nobelBalance = await this.NodeMainInstance
                          .methods.getBalanceOfNobels(account).call();
    this.setState({
      litterBalance: litterBalance,
      nobelBalance: nobelBalance
    })
  }

  postLitterOnContract = async (uri, caption) => {
    const currentAccount = this.state.currentAccount;
    const response = await this.NodeMainInstance.methods
                  .createNobelLitter(uri, caption).send({
                    from: currentAccount,
                    gas: this.gas,
                    gasPrice: this.gasPrice
                  }).on('error',(error)=>{
                              alert("Litter Already Exists"); 
                              return false;
                            });
    console.log(response);
    await this.fetchUserStats(this.state.currentAccount);
    return true;
  }

  render() {
    if (!this.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App container">
        <div className={'row'}>
          <UserStats 
              userAddress={this.state.currentAccount} 
              totalLitters={this.state.litterBalance} 
              nobelBalance={this.state.nobelBalance} 
              />
        </div>
        <div className={'row'}>
          <PostLitter postLitterOnContract={this.postLitterOnContract} />
          <ViewLitters litters={this.state.litters} giftReward={this.giftReward} />
        </div>
      </div>
    );
  }
}

export default App;


const UserStats = ({userAddress, totalLitters, nobelBalance}) => {


  return (
        <div className={'user-stats col-12 d-flex flex-wrap justify-content-around'}>
            <p className={'h5'} style={{wordBreak: 'break-all'}} >
              User Address:- {userAddress}
            </p>
            <p className={'h5'} style={{wordBreak: 'break-all'}} >
            Total Litters Sumbitted:- {totalLitters}
            </p>
            <p className={'h5'} style={{wordBreak: 'break-all'}} >
            Nobel Balance:- {nobelBalance}
            </p>
        </div>
  )


}

const PostLitter = ({postLitterOnContract}) => {

  const DESTROY_LITTER = "Destroy Litter!";
  const SORTING = "Sorting....";
  const DESTROYING = "Destroying....";

  const [imageLoaded, setImageLoaded] = useState(false);
  const [file, setFile] = useState();
  const [previewImage, setPreviewImage] = useState();
  const [caption, setCaption] = useState();
  const [postingState, setPostingState] = useState(DESTROY_LITTER)

  const handleCaptionChange = (event) => {
    if(event.target.value!==null){
      setCaption(event.target.value);
    }
  }

  const handleInputFile = async  (event) => {
    if( event.target.files && event.target.files[0] ){
      const file = event.target.files[0];
      setPreviewImage(URL.createObjectURL(file));
      setImageLoaded(true);
      setPostingState(SORTING);
      const options = {
          maxSizeMB: 0.25
      };
      const compressedFile = await imageCompression(file, options);
      console.log(compressedFile);
      const reader = new window.FileReader();
      reader.readAsArrayBuffer(compressedFile);
      reader.onloadend = () => {
        setPostingState(DESTROY_LITTER);
        setFile(Buffer(reader.result));
      }
    }
  }

  const handleDestroyLitter = async () => {
    if(postingState!==DESTROY_LITTER) return;
    if(file===null) return;
    setPostingState(DESTROYING)
    console.log(file);
    const result = await ipfs.add(file);
    console.log(result);
    const flag = await postLitterOnContract(
                                        result.path, caption || 'Awesome'
                                        )
    if(!flag) { alert("Destroying Failed"); return; }
    alert("Destroyed Successfully");
    setPostingState(DESTROY_LITTER);
  }


  return (
          <div className={'col-12 col-md-6 post-litter'} >
            <form >
              <div className={'custom-file mt-5 mb-3'}>
                <input 
                    type={'file'} 
                    onChange={handleInputFile}
                    placeholder={"Upload the litter"} 
                    className={'upload-litter custom-file-input'} 
                    id={'customFile'} 
                  />
                <label 
                    className={'custom-file-label'}
                    htmlFor={'customFile'}
                    >
                      Pick Up Litter...
                  </label>
              </div>
              <div className={"form-group mt-1 mb-3"}>
                <label htmlFor="exampleFormControlInput1">Something About Litter</label>
                <input type={"text"} onChange={handleCaptionChange} value={caption} className={"form-control"} id={"exampleFormControlInput1"} placeholder={"Worst"} />
              </div>
              {
                imageLoaded?
                    <div className={'litter-preview-container mt-3 mb-3 p-2'}>
                      <img src={previewImage} alt={'litter-preview'} className={'LitterPreview'} />
                    </div>
                    :
                    <></>
              }
              <div>
                <button type={'button'} onClick={handleDestroyLitter} className={'btn btn-danger mt-3 mb-3'} >
                  {postingState}
                </button>
              </div>
            </form>
          </div>
  )


}


const ViewLitters = ({litters, giftReward}) => {

  const renderLitters = (litters) =>
        litters.map(
            litter => <LitterCard litter={litter} key={litter.tokenId} giftReward={giftReward} />
          )

  return (
          <div className={'col-12 col-md-6 pt-5 view-litters'} >
            <h2>
              Litters by the community
            </h2>
            <div className={'mt-5 mb-5 p-2'}>
                {renderLitters(litters)}
            </div>
          </div>
  )

}

const LitterCard = ({litter, giftReward}) => {

  const [isGifting, setIsGifting] = useState(false);

  const giveReward = async () => {
    setIsGifting(true);
    alert(`Are you sure you want to gift ${litter.creator}, 1 Nobel Token`);
    const flag = await giftReward(litter.creator);
    if(!flag){
      alert("Sending Reward Failed");
      return;
    }
    alert("Sent");
    setIsGifting(false)
  }

  return (
          <div className={'w-100 d-flex justify-content-center'}>
            <div className={"card mt-2 mb-2"} style={{width: '20rem'}}>
                  <img src={`https://ipfs.infura.io/ipfs/${litter.tokenUri}`} className="card-img-top" alt="..." />
                  <div className="card-body">
                    <h5 className="card-title">{litter.creator}</h5>
                    <p className="card-body">{litter.caption}</p>
                    <button type={'button'} className="btn btn-primary" onClick={giveReward} >
                      {
                        isGifting?
                          "Sending...."
                          :
                          "Give 1 Nobel Token as Reward"
                      }
                    </button>
                  </div>
            </div>
          </div>
  )


}
