import Web3 from "web3";
import fs from "fs";

const abiContent = JSON.parse(fs.readFileSync("./abi.json", "utf8"));
const web3 = new Web3("https://arb1.arbitrum.io/rpc");

const contractAddress = "0x1cdc19b13729f16c5284a0ace825f83fc9d799f4";

const contract = new web3.eth.Contract(abiContent, contractAddress);

// private key metamask
const privateKey = "e85d11402c68831912ec7af079ee205b85bbe56889986c81";

// Giá betting, tối thiểu 0.00001 eth mạng arb
const betValue = "0.0001";

// Số eth tối thiểu có trong ví
const minBalance = "0.0001";

const betBull = async () => {
  console.log("\n==================== STARTING ====================\n");
  const wallet = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`);
  const address = wallet.address;
  const balance = await web3.eth.getBalance(address);
  const balanceInWei = web3.utils.fromWei(balance, "ether");
  console.log(`Số dư còn lại: ${balanceInWei}`);

  if (Number(balanceInWei) < Number(minBalance)) {
    console.log(`Số dư trong ví còn quá ít, số dư: ${balanceInWei}`);
  } else {
    const betValueInWei = web3.utils.toWei(betValue, "ether");
    const currentEpoch: any = await contract.methods.currentEpoch().call();

    // 1. Claim reward của 5 epoch trước đó
    await claimEpoch(currentEpoch, address);

    // 2. Kiểm tra epoch hiện tại có thể betting được không
    const isBet = await hasBet(currentEpoch, wallet.address);

    if (isBet) {
      console.log(`Bạn đã betting epoch ${currentEpoch} rồi \n`);
    } else {
      // 3. Betting
      try {
        let nonce = await web3.eth.getTransactionCount(wallet.address, "pending");
        const gasPrice = await web3.eth.getGasPrice();

        const gasEstimate = await web3.eth.estimateGas({
          from: wallet.address,
          to: contractAddress,
          data: contract.methods.betBull(currentEpoch).encodeABI(),
          value: betValueInWei,
        });

        const txn = {
          to: contractAddress,
          data: contract.methods.betBull(currentEpoch).encodeABI(),
          gasLimit: gasEstimate,
          gasPrice: BigInt(gasPrice) + BigInt(gasPrice) / 5n,
          nonce,
          value: betValueInWei,
        };

        console.log(`Đang betting, epoch: ${currentEpoch}`);
        const signedTxn = await web3.eth.accounts.signTransaction(txn, `0x${privateKey}`);
        const txHash = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction as string);
        console.log(`Betting thành công epoch: ${currentEpoch}, tx: ${txHash.transactionHash}`);
      } catch (error: any) {
        console.log("Đã xảy ra lỗi, ", error);
      }
    }
  }
  console.log(`Source x.com/trangchongcheng edit nhacmatquan - telegram: t.me/airdrop101xyz\n`);
  console.log("====================== END ======================\n");
};

const hasBet = async (epoch: any, address: string) => {
  try {
    const betInfo: any = await contract.methods.ledger(epoch, address).call();
    return betInfo[1] > 0;
  } catch (error) {
    console.log(`\nLỗi kiểm tra betting, epoch: ${epoch}: ${error}`);
    return false;
  }
};

const claimEpoch = async (currentEpoch: any, address: string) => {
  for (let epoch = BigInt(currentEpoch) - 5n; epoch < BigInt(currentEpoch); epoch++) {
    const claimable = await contract.methods.claimable(epoch.toString(), address).call();
    if (claimable) {
      console.log(`Đang claim reward epoch ${epoch}`);
      try {
        const gasEstimate = await web3.eth.estimateGas({
          from: address,
          to: contractAddress,
          data: contract.methods.claim([epoch.toString()]).encodeABI(),
        });
        let nonce = await web3.eth.getTransactionCount(address, "pending");
        const gasPrice = await web3.eth.getGasPrice();

        const txn = {
          to: contractAddress,
          data: contract.methods.claim([epoch.toString()]).encodeABI(),
          gas: gasEstimate,
          gasPrice: BigInt(gasPrice) + BigInt(gasPrice) / 5n,
          nonce,
        };
        const signedTxn = await web3.eth.accounts.signTransaction(txn, `0x${privateKey}`);
        const txHash = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction as string);
        console.log(`Claim thành công reward epoch: ${epoch}, tx: ${txHash.transactionHash}`);
      } catch (error) {
        console.error(`Lỗi khi claim reward ở epoch ${epoch}: ${error}`);
      }
    }
  }
};

setInterval(betBull, 6 * 59 * 1000);
