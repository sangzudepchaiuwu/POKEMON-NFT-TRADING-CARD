// Web3 Configuration
const WEB3_CONFIG = {
  fuji: {
    chainId: '0xa869',          // 43113 in hex
    chainIdDec: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    name: 'Avalanche Fuji Testnet',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    blockExplorerUrl: 'https://testnet.snowtrace.io'
  }
};

// Global Web3 state (window.* avoids cross-script TDZ issues)
window.web3Instance = null;
window.userAccount = null;
window.selectedNetwork = 'fuji';

/**
 * Initialize Web3
 */
async function initWeb3() {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask.');
  }

  window.web3Instance = new Web3(window.ethereum);

  window.ethereum.on('accountsChanged', (accounts) => {
    window.userAccount = accounts[0] || null;
    updateWalletUI();
  });

  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });

  return window.web3Instance;
}

/**
 * Connect wallet
 */
async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask.');
  }

  if (!window.web3Instance) {
    await initWeb3();
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  });

  window.userAccount = accounts[0];

  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId !== WEB3_CONFIG.fuji.chainId) {
    await switchToFuji();
  }

  updateWalletUI();
  return window.userAccount;
}

/**
 * Switch to Fuji network
 */
async function switchToFuji() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: WEB3_CONFIG.fuji.chainId }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await addFujiNetwork();
    } else {
      throw switchError;
    }
  }
}

/**
 * Add Fuji network to MetaMask
 */
async function addFujiNetwork() {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: WEB3_CONFIG.fuji.chainId,
      chainName: WEB3_CONFIG.fuji.name,
      rpcUrls: [WEB3_CONFIG.fuji.rpcUrl],
      nativeCurrency: WEB3_CONFIG.fuji.nativeCurrency,
      blockExplorerUrls: [WEB3_CONFIG.fuji.blockExplorerUrl],
    }],
  });
}

/**
 * Get contract instance
 */
function getContract(contractName, address) {
  if (!window.web3Instance) {
    throw new Error('Web3 not initialized');
  }

  const abi = window.CONTRACT_ABIS?.[contractName];
  if (!abi) {
    throw new Error(`ABI not found for ${contractName}`);
  }

  return new window.web3Instance.eth.Contract(abi, address);
}

/**
 * Send transaction
 */
async function sendTransaction(contractAddress, methodName, params, abi) {
  if (!window.userAccount) {
    throw new Error('Wallet not connected');
  }

  const contract = new window.web3Instance.eth.Contract(abi, contractAddress);
  const method = contract.methods[methodName](...params);

  const gas = await method.estimateGas({ from: window.userAccount });
  const data = method.encodeABI();

  const tx = {
    to: contractAddress,
    from: window.userAccount,
    data: data,
    gas: Math.ceil(gas * 1.1),
    gasPrice: await window.web3Instance.eth.getGasPrice()
  };

  return window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [tx],
  });
}

/**
 * Call contract method (read-only)
 */
async function callContractMethod(contractAddress, methodName, params, abi) {
  const contract = new window.web3Instance.eth.Contract(abi, contractAddress);
  return contract.methods[methodName](...params).call();
}

/**
 * Update wallet UI
 */
function updateWalletUI() {
  const walletStatus = document.getElementById('walletStatus');
  const connectBtn = document.getElementById('connectBtn');

  if (!walletStatus || !connectBtn) return;

  if (window.userAccount) {
    walletStatus.textContent = `${window.userAccount.substring(0, 6)}...${window.userAccount.substring(window.userAccount.length - 4)}`;
    walletStatus.style.background = 'rgba(76, 175, 80, 0.2)';
    walletStatus.style.borderColor = '#4CAF50';
    connectBtn.textContent = 'Ngắt Kết Nối';
    connectBtn.onclick = disconnectWallet;
    if (typeof refreshMyPacks === 'function') refreshMyPacks();
    if (typeof loadInventory === 'function') loadInventory();
  } else {
    walletStatus.textContent = 'Chưa kết nối';
    walletStatus.style.background = 'rgba(255, 255, 255, 0.1)';
    walletStatus.style.borderColor = '#FFD700';
    connectBtn.textContent = 'Kết Nối Ví';
    connectBtn.onclick = () => connectWallet().catch((error) => {
      console.error('Wallet connection error:', error);
      if (typeof showAlert === 'function') {
        showAlert('Lỗi kết nối ví: ' + error.message, 'error');
      }
    });
    if (typeof loadInventory === 'function') loadInventory();
  }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
  window.userAccount = null;
  updateWalletUI();
  if (typeof showAlert === 'function') {
    showAlert('Đã ngắt kết nối ví', 'info');
  }
}

/**
 * Get user balance
 */
async function getUserBalance() {
  if (!window.userAccount || !window.web3Instance) return null;
  const balance = await window.web3Instance.eth.getBalance(window.userAccount);
  return window.web3Instance.utils.fromWei(balance, 'ether');
}

/**
 * Convert Wei to AVAX
 */
function weiToAvax(wei) {
  return window.web3Instance.utils.fromWei(window.web3Instance.utils.toBN(wei), 'ether');
}

/**
 * Convert AVAX to Wei
 */
function avaxToWei(avax) {
  return window.web3Instance.utils.toWei(avax.toString(), 'ether');
}

let appConfigCache = null;

async function getAppConfigCached() {
  if (appConfigCache) return appConfigCache;
  const res = await fetch(`${window.location.origin}/api/config`);
  appConfigCache = await res.json();
  return appConfigCache;
}

/**
 * User ký transaction mua pack — tiền vào owner, không cần owner trả pack thủ công
 */
async function buyPackOnChain(collection) {
  if (!window.userAccount || !window.web3Instance) {
    throw new Error('Vui lòng kết nối ví');
  }

  const config = await getAppConfigCached();
  const factoryAddress = config.contracts?.PackFactory;
  if (!factoryAddress) {
    throw new Error('Chưa cấu hình địa chỉ PackFactory (deploy contract)');
  }

  const priceAvax = config.packPrices?.[collection.toUpperCase()] || 0.5;
  const valueWei = window.web3Instance.utils.toWei(String(priceAvax), 'ether');
  const collectionKey = collection.toUpperCase();

  const abi = [
    {
      inputs: [{ name: 'collection', type: 'string' }],
      name: 'buyPack',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'payable',
      type: 'function',
    },
  ];

  const contract = new window.web3Instance.eth.Contract(abi, factoryAddress);

  return new Promise((resolve, reject) => {
    contract.methods
      .buyPack(collectionKey)
      .send({ from: window.userAccount, value: valueWei })
      .on('receipt', (receipt) => {
        resolve({ txHash: receipt.transactionHash });
      })
      .on('error', (err) => reject(err));
  });
}

/**
 * MARKETPLACE — On-chain transactions
 * Mỗi action sinh block thật trên Avalanche Fuji
 */

/** approve marketplace để transfer NFT của user */
async function approveMarketplaceForToken(tokenId) {
  const config = await getAppConfigCached();
  const cardAddress = config.contracts?.PokemonCard;
  const marketAddress = config.contracts?.Marketplace;
  if (!cardAddress || !marketAddress) {
    throw new Error('Chưa cấu hình contract addresses');
  }
  const card = new window.web3Instance.eth.Contract(window.CONTRACT_ABIS.PokemonCard, cardAddress);

  // Check nếu đã approve all rồi → skip
  try {
    const isAll = await card.methods.isApprovedForAll(window.userAccount, marketAddress).call();
    if (isAll) return null;
    const cur = await card.methods.getApproved(tokenId).call();
    if (cur.toLowerCase() === marketAddress.toLowerCase()) return null;
  } catch {}

  // setApprovalForAll (1 lần cho tất cả NFT) — tiết kiệm gas về sau
  return new Promise((resolve, reject) => {
    card.methods
      .setApprovalForAll(marketAddress, true)
      .send({ from: window.userAccount })
      .on('receipt', (r) => resolve(r))
      .on('error', reject);
  });
}

/** List NFT lên Marketplace contract */
async function listOnChain({ tokenId, priceAvax }) {
  if (!window.userAccount) throw new Error('Vui lòng kết nối ví');
  const config = await getAppConfigCached();
  const marketAddress = config.contracts?.Marketplace;
  if (!marketAddress) throw new Error('Chưa cấu hình Marketplace address');

  // Bước 1: approve
  await approveMarketplaceForToken(tokenId);

  // Bước 2: listCard
  const market = new window.web3Instance.eth.Contract(window.CONTRACT_ABIS.Marketplace, marketAddress);
  const priceWei = window.web3Instance.utils.toWei(String(priceAvax), 'ether');

  return new Promise((resolve, reject) => {
    market.methods
      .listCard(tokenId, priceWei)
      .send({ from: window.userAccount })
      .on('receipt', (receipt) => {
        // Lấy listingId từ event ListingCreated
        let onChainListingId = null;
        try {
          const ev = receipt.events?.ListingCreated;
          if (ev) onChainListingId = Number(ev.returnValues.listingId);
        } catch {}
        resolve({ txHash: receipt.transactionHash, onChainListingId, receipt });
      })
      .on('error', reject);
  });
}

/** Mua NFT — gửi AVAX qua buyCard() */
async function buyOnChain({ onChainListingId, priceAvax }) {
  if (!window.userAccount) throw new Error('Vui lòng kết nối ví');
  const config = await getAppConfigCached();
  const marketAddress = config.contracts?.Marketplace;
  if (!marketAddress) throw new Error('Chưa cấu hình Marketplace address');

  const market = new window.web3Instance.eth.Contract(window.CONTRACT_ABIS.Marketplace, marketAddress);
  const valueWei = window.web3Instance.utils.toWei(String(priceAvax), 'ether');

  return new Promise((resolve, reject) => {
    market.methods
      .buyCard(onChainListingId)
      .send({ from: window.userAccount, value: valueWei })
      .on('receipt', (receipt) => resolve({ txHash: receipt.transactionHash, receipt }))
      .on('error', reject);
  });
}

/** Hủy listing */
async function cancelListingOnChain(onChainListingId) {
  if (!window.userAccount) throw new Error('Vui lòng kết nối ví');
  const config = await getAppConfigCached();
  const marketAddress = config.contracts?.Marketplace;
  if (!marketAddress) throw new Error('Chưa cấu hình Marketplace address');

  const market = new window.web3Instance.eth.Contract(window.CONTRACT_ABIS.Marketplace, marketAddress);
  return new Promise((resolve, reject) => {
    market.methods
      .cancelListing(onChainListingId)
      .send({ from: window.userAccount })
      .on('receipt', (receipt) => resolve({ txHash: receipt.transactionHash, receipt }))
      .on('error', reject);
  });
}

/** Buyer đặt offer — lock AVAX trong Marketplace contract */
async function makeOfferOnChain({ onChainListingId, priceAvax }) {
  if (!window.userAccount) throw new Error('Vui lòng kết nối ví');
  const config = await getAppConfigCached();
  const marketAddress = config.contracts?.Marketplace;
  if (!marketAddress) throw new Error('Chưa cấu hình Marketplace address');

  const market = new window.web3Instance.eth.Contract(window.CONTRACT_ABIS.Marketplace, marketAddress);
  const valueWei = window.web3Instance.utils.toWei(String(priceAvax), 'ether');

  return new Promise((resolve, reject) => {
    market.methods
      .makeOffer(onChainListingId)
      .send({ from: window.userAccount, value: valueWei })
      .on('receipt', (receipt) => {
        let onChainOfferId = null;
        try {
          const ev = receipt.events?.OfferMade;
          if (ev) onChainOfferId = Number(ev.returnValues.offerId);
        } catch {}
        resolve({ txHash: receipt.transactionHash, onChainOfferId, receipt });
      })
      .on('error', reject);
  });
}

/** Buyer hủy offer của mình → contract refund AVAX */
async function cancelOfferOnChain(onChainOfferId) {
  if (!window.userAccount) throw new Error('Vui lòng kết nối ví');
  const config = await getAppConfigCached();
  const marketAddress = config.contracts?.Marketplace;

  const market = new window.web3Instance.eth.Contract(window.CONTRACT_ABIS.Marketplace, marketAddress);
  return new Promise((resolve, reject) => {
    market.methods
      .cancelOffer(onChainOfferId)
      .send({ from: window.userAccount })
      .on('receipt', (r) => resolve({ txHash: r.transactionHash, receipt: r }))
      .on('error', reject);
  });
}

/** Seller chấp nhận offer — NFT → buyer, AVAX (- fee) → seller */
async function acceptOfferOnChain(onChainOfferId) {
  if (!window.userAccount) throw new Error('Vui lòng kết nối ví');
  const config = await getAppConfigCached();
  const marketAddress = config.contracts?.Marketplace;

  const market = new window.web3Instance.eth.Contract(window.CONTRACT_ABIS.Marketplace, marketAddress);
  return new Promise((resolve, reject) => {
    market.methods
      .acceptOffer(onChainOfferId)
      .send({ from: window.userAccount })
      .on('receipt', (r) => resolve({ txHash: r.transactionHash, receipt: r }))
      .on('error', reject);
  });
}

window.listOnChain = listOnChain;
window.buyOnChain = buyOnChain;
window.cancelListingOnChain = cancelListingOnChain;
window.makeOfferOnChain = makeOfferOnChain;
window.cancelOfferOnChain = cancelOfferOnChain;
window.acceptOfferOnChain = acceptOfferOnChain;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initWeb3();
    console.log('✅ Web3 initialized');

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      window.userAccount = accounts[0];
    }

    updateWalletUI();
  } catch (error) {
    console.error('Web3 initialization error:', error);
    updateWalletUI();
    if (typeof showAlert === 'function') {
      showAlert('Lỗi khởi tạo Web3: ' + error.message, 'error');
    }
  }
});
