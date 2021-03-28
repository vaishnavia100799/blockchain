//compile.js
const path = require('path');
const fs = require('fs');
const solc = require('solc');

const webPath = path.resolve(__dirname,'Contracts','web.sol');
const web = fs.readFileSync(webPath,'utf-8');

var input = {
    language: 'Solidity',
    sources: {
      'web.sol': {
        content: web
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };

function findImports(path) {
    if (path === 'lib.sol')
    return {
      contents:
        'library L { function f() internal returns (uint) { return 7; } }'
    };
  else return { error: 'File not found' };
}

const TransitManagement = JSON.parse(
                            solc.compile(JSON.stringify(input)
                                          , {import: findImports} ))
                            .contracts['web.sol']['TransitManagement'];

const artifacts = TransitManagement.abi;
const bytecode = TransitManagement.evm.bytecode.object;

module.exports = {artifacts, bytecode}



//deploy.js

const Web3 = require('web3');

const { artifacts, bytecode } = require('./compile');

const provider = 'http://127.0.0.1:8545';
const web3 = new Web3(provider);

const setDefaultAccount = (account) => {
    web3.eth.defaultAccount = account;
}

web3.eth.getAccounts().then(
            (accounts)=>setDefaultAccount(accounts[0])
    );

const transit = new web3.eth.Contract(artifacts);

const trx = transit.deploy({
    data: bytecode,
    arguments: ['0xf8CD7e4242FFA3689cBA72C98a3393F212A580B5']
});

const trxInstance = trx.send({
    from: '0x8C87C945a9792f1091987989cC6aCC77b7C10ec2',
    gas: '3000000',
    gasPrice: '1000000'
},(err,trxHash)=>console.log("Success"))
        .then(
            (instance)=>instance.methods.products().call().then(console.log)
        );
