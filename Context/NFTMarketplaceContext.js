import React, { useState, useEffect, useContext } from "react";
import Wenb3Modal from "web3modal";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import axios from "axios";
import { create as ipfsHttpClient } from "ipfs-http-client";

// const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");

const projectId = "2ONf3PP6K8sYU7ciZfrtPES3iS3";
const projectSecretKey = "7eaa2be07a463801ac87e339ee63c652";
const auth = `Basic ${Buffer.from(`${projectId}:${projectSecretKey}`).toString(
  "base64"
)}`;

const client = ipfsHttpClient({
  host: "infura-ipfs.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization: auth,
  },
});

//INTERNAL  IMPORT
import {
  NFTMarketplaceAddress,
  NFTMarketplaceABI,
  transferFundsAddress,
  transferFundsABI,
} from "./constants";

// const signer = provider.getSigner("0x78aF1950C7AB433DbA3775aB9529757a510b61Ba");

//---FETCHING SMART CONTRACT
const fetchContract = (signerOrProvider) =>
  new ethers.Contract(
    NFTMarketplaceAddress,
    NFTMarketplaceABI,
    signer
  );

//---CONNECTING WITH SMART CONTRACT

const connectingWithSmartContract = async () => {
  try {
    const web3Modal = new Wenb3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = fetchContract(signer);
    return contract;
  } catch (error) {
    console.log("Hãy kết nối với ví", error);
  }
};

//----TRANSFER FUNDS

const fetchTransferFundsContract = (signerOrProvider) =>
  new ethers.Contract(transferFundsAddress, transferFundsABI, signerOrProvider);

const connectToTransferFunds = async () => {
  try {
    // const web3Modal = new Wenb3Modal();
    // const connection = await web3Modal.connect();
    // const provider = new ethers.providers.Web3Provider(connection);
    const provider = new ethers.providers.JsonRpcProvider(
      "https://sepolia.infura.io/v3/752155e79a924e21b1477a5502103ca8"
    );
    const signer = provider.getSigner();
    const contract = fetchTransferFundsContract(signer);
    return contract;
  } catch (error) {
    console.log(error);
  }
};

export const NFTMarketplaceContext = React.createContext();

export const NFTMarketplaceProvider = ({ children }) => {
  const titleData = "Discover, collect, and sell NFTs";

  //------USESTAT
  const [error, setError] = useState("");
  const [openError, setOpenError] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const router = useRouter();

  //---CHECK IF WALLET IS CONNECTD
  const checkIfWalletConnected = async () => {
    try {
      if (!window.ethereum)
        return setOpenError(true), setError("Install MetaMask");

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);
      } else {
        setError("Không tìm thấy tài khoản");
        setOpenError(true);
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const getBalance = await provider.getBalance(accounts[0]);
      const bal = ethers.utils.formatEther(getBalance);
      setAccountBalance(bal);
    } catch (error) {
      setError("Hãy kết nối với ví");
      setOpenError(true);
    }
  };

  useEffect(() => {
    checkIfWalletConnected();
    connectingWithSmartContract();
  }, []);

  //---CONNET WALLET FUNCTION
  const connectWallet = async () => {
    try {
      if (!window.ethereum)
        return setOpenError(true), setError("Install MetaMask");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setCurrentAccount(accounts[0]);
      // window.location.reload();
    } catch (error) {
      setError("Hãy kết nối với ví");
      setOpenError(true);
    }
  };

  //---UPLOAD TO IPFS FUNCTION
  const uploadToIPFS = async (file) => {
    try {
      const added = await client.add({ content: file });
      const url = `https://nft-distribute.infura-ipfs.io/ipfs/${added.path}`;
      console.log(url);
      return url;
    } catch (error) {
      setError("Lôi khi upload ảnh lên IPFS");
      setOpenError(true);
    }
  };

  //---CREATENFT FUNCTION
  const createNFT = async (
    name,
    price,
    image,
    description,
    category,
    router
  ) => {
    if (!name || !description || !price || !image || !category)
      return setError("Data Is Missing"), setOpenError(true);

    const data = JSON.stringify({ name, description, image, category });

    try {
      const added = await client.add(data);

      const url = `https://nft-distribute.infura-ipfs.io/ipfs/${added.path}`;
      console.log(url);

      await createSale(url, price);
      router.push("/searchPage");
    } catch (error) {
      setError("Lỗi khi tạo nft");
      setOpenError(true);
      console.log(error);
    }
  };

  //--- createSale FUNCTION
  const createSale = async (url, formInputPrice, isReselling, id) => {
    try {
      console.log(url, formInputPrice, isReselling, id);
      const price = ethers.utils.parseUnits(formInputPrice, "ether");

      const contract = await connectingWithSmartContract();
      console.log(contract);

      const listingPrice = await contract.getListingPrice();
      console.log(listingPrice);

      const transaction = !isReselling
        ? await contract.createToken(url, price, {
            value: listingPrice.toString(),
          })
        : await contract.resellToken(id, price, {
            value: listingPrice.toString(),
          });

      await transaction.wait();
      console.log(transaction);
    } catch (error) {
      setError("Lỗi khi tạo đơn giá của nft");
      console.log("error while creating sale");
      setOpenError(true);
      console.log(error);
    }
  };

  //--FETCHNFTS FUNCTION

  const fetchNFTs = async () => {
    try {
      if (currentAccount) {
        const provider = new ethers.providers.JsonRpcProvider(
          "https://sepolia.infura.io/v3/752155e79a924e21b1477a5502103ca8"
        );
        console.log(provider);
        const contract = fetchContract(provider);

        const data = await contract.fetchMarketItems();
        console.log(data);

        const items = await Promise.all(
          data.map(
            async ({ tokenId, seller, owner, price: unformattedPrice }) => {
              const tokenURI = await contract.tokenURI(tokenId);
              console.log(tokenURI);

              if (tokenURI.includes("nft-distribute")) {
                console.log(tokenURI);

                const {
                  data: { image, name, description, category },
                } = await axios.get(tokenURI);
                console.log(data);
                const price = ethers.utils.formatUnits(
                  unformattedPrice.toString(),
                  "ether"
                );

                return {
                  price,
                  tokenId: tokenId.toNumber(),
                  seller,
                  owner,
                  image,
                  name,
                  description,
                  category,
                  tokenURI,
                };
              }
            }
          )
        );

        console.log(items);

        return items.filter((item) => item !== undefined);
      }
    } catch (error) {
      setError("Không thể hiển thị danh sách NFT");
      setOpenError(true);
      console.log(error);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      fetchNFTs();
    }
  }, []);

  //--FETCHING MY NFT OR LISTED NFTs
  const fetchMyNFTsOrListedNFTs = async (type) => {
    try {
      if (currentAccount) {
        const contract = await connectingWithSmartContract();

        const data =
          type == "fetchItemsListed"
            ? await contract.fetchItemsListed()
            : await contract.fetchMyNFTs();

        const items = await Promise.all(
          data.map(
            async ({ tokenId, seller, owner, price: unformattedPrice }) => {
              const tokenURI = await contract.tokenURI(tokenId);
              if (tokenURI.includes("nft-distribute")) {
                const {
                  data: { image, name, description, category },
                } = await axios.get(tokenURI);
                const price = ethers.utils.formatUnits(
                  unformattedPrice.toString(),
                  "ether"
                );

                console.log(await axios.get(tokenURI));

                return {
                  price,
                  tokenId: tokenId.toNumber(),
                  seller,
                  owner,
                  image,
                  name,
                  description,
                  category,
                  tokenURI,
                };
              }
            }
          )
        );
        return items.filter((item) => item !== undefined);
      }
    } catch (error) {
      setError("Không thể hiển thị NFT của bạn");
      setOpenError(true);
    }
  };

  useEffect(() => {
    fetchMyNFTsOrListedNFTs();
  }, []);

  //---BUY NFTs FUNCTION
  const buyNFT = async (nft) => {
    try {
      const contract = await connectingWithSmartContract();
      const price = ethers.utils.parseUnits(nft.price.toString(), "ether");

      const transaction = await contract.createMarketSale(nft.tokenId, {
        value: price,
      });

      await transaction.wait();
      router.push("/author");
    } catch (error) {
      setError("Không thể mua NFT");
      setOpenError(true);
    }
  };

  //---BUY NFTs FUNCTION
  const unSellNFT = async (nft) => {
    try {
      const contract = await connectingWithSmartContract();
      console.log(nft);
      const price = ethers.utils.parseUnits(nft.price.toString(), "ether");

      const transaction = await contract.unsellToken(nft.tokenId, price);

      await transaction.wait();
      router.push("/author");
    } catch (error) {
      setError("Không thể ngung ban");
      console.log(error);
      router.push("/author");
    }
  };
  //------------------------------------------------------------------
  //---TRANSFER FUNDS
  const [transactionCount, setTransactionCount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const transferEther = async (address, ether, message) => {
    try {
      if (currentAccount) {
        const contract = await connectToTransferFunds();
        await window.ethereum.enable()
        console.log(address, ether, message);

        const unFormatedPrice = ethers.utils.parseEther(ether);
        console.log(unFormatedPrice);

        // //FIRST METHOD TO TRANSFER FUND
        await ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: currentAccount,
              to: address,
              gas: "0x5208",
              value: unFormatedPrice._hex,
            },
          ],
        });
        console.log(1);



        const transaction = await contract.addDataToBlockchain(
          address,
          unFormatedPrice,
          message
        );
      

        console.log(transaction);

        setLoading(true);
        transaction.wait();
        setLoading(false);
        console.log(transaction);

        const transactionCount = await contract.getTransactionCount();
        console.log(transactionCount);
        setTransactionCount(transactionCount.toNumber());
        console.log("Thành công")
        window.location.reload();
      }
    } catch (error) {
      console.log(error);
      setError("Giao dịch thành công vui lòng kiểm tra ví");
    }
  };

  //FETCH ALL TRANSACTION
  const getAllTransactions = async () => {
    try {
      if (ethereum) {
        const contract = await connectToTransferFunds();

        const avaliableTransaction = await contract.getAllTransactions();

        const readTransaction = avaliableTransaction.map((transaction) => ({
          addressTo: transaction.receiver,
          addressFrom: transaction.sender,
          timestamp: new Date(
            transaction.timestamp.toNumber() * 1000
          ).toLocaleString(),
          message: transaction.message,
          amount: parseInt(transaction.amount._hex) / 10 ** 18,
        }));
        console.log(readTransaction)

        setTransactions(readTransaction);
        console.log(transactions);
      } else {
        console.log("On Ethereum");
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <NFTMarketplaceContext.Provider
      value={{
        checkIfWalletConnected,
        connectWallet,
        uploadToIPFS,
        createNFT,
        fetchNFTs,
        fetchMyNFTsOrListedNFTs,
        buyNFT,
        createSale,
        currentAccount,
        titleData,
        setOpenError,
        openError,
        error,
        transferEther,
        getAllTransactions,
        loading,
        accountBalance,
        transactionCount,
        transactions,
        unSellNFT,
      }}
    >
      {children}
    </NFTMarketplaceContext.Provider>
  );
};
