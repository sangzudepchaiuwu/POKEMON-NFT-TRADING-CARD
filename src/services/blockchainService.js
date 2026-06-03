const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { PACK_CONFIG } = require('../config/rarity');

const DEPLOYMENT_PATH = path.join(__dirname, '../../deployment-fuji.json');

const loadDeployment = () => {
  if (process.env.PACK_FACTORY_ADDRESS) {
    return {
      PackFactory: process.env.PACK_FACTORY_ADDRESS,
      PokemonCard: process.env.POKEMON_CARD_ADDRESS,
      Marketplace: process.env.MARKETPLACE_ADDRESS,
    };
  }
  if (fs.existsSync(DEPLOYMENT_PATH)) {
    const data = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, 'utf-8'));
    return data.contracts;
  }
  return null;
};

const RPC_URLS = [
  process.env.AVAX_RPC_URL,
  'https://rpc.ankr.com/avalanche_fuji',
  'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc',
  'https://avalanche-fuji-c-chain-rpc.publicnode.com',
  'https://api.avax-test.network/ext/bc/C/rpc',
].filter(Boolean);

const withTimeout = (promise, ms, label = 'operation') =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

const createProvider = (url) =>
  new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });

const getProvider = () => createProvider(RPC_URLS[0]);

/**
 * Thử lần lượt từng RPC cho đến khi một cái trả về blockNumber thành công.
 */
const getActiveProvider = async (timeoutMs = 6000) => {
  const unique = [...new Set(RPC_URLS)];
  for (const url of unique) {
    try {
      const p = createProvider(url);
      await withTimeout(p.getBlockNumber(), timeoutMs, `RPC ${url}`);
      return p;
    } catch {
      // try next
    }
  }
  throw new Error('All RPC endpoints unavailable. Check AVAX_RPC_URL in .env');
};

const getOwnerWallet = async () => {
  const key = process.env.AVAX_PRIVATE_KEY;
  if (!key) throw new Error('AVAX_PRIVATE_KEY missing for background mint');
  const provider = await getActiveProvider();
  return new ethers.Wallet(key, provider);
};

const getPackFactoryAbi = () =>
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../../artifacts/contracts/PackFactory.sol/PackFactory.json'),
      'utf-8'
    )
  ).abi;

const getPackFactoryRead = async () => {
  const addresses = loadDeployment();
  if (!addresses?.PackFactory) throw new Error('PackFactory address not configured');
  const provider = await getActiveProvider();
  return new ethers.Contract(addresses.PackFactory, getPackFactoryAbi(), provider);
};

const getPackFactoryWrite = async () => {
  const addresses = loadDeployment();
  const wallet = await getOwnerWallet();
  return new ethers.Contract(addresses.PackFactory, getPackFactoryAbi(), wallet);
};

const getExpectedPackPriceWei = (collection) => {
  const avax = PACK_CONFIG.prices[collection.toUpperCase()] || 0.5;
  return ethers.parseEther(String(avax));
};

const waitForTransactionReceipt = async (provider, txHash, maxAttempts = 20, delayMs = 1500) => {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
};

/**
 * Xác nhận user đã gọi buyPack và trả đúng tiền cho PackFactory.
 * Nếu RPC timeout, ném lỗi có code 'VERIFY_TIMEOUT' để caller có thể graceful degrade.
 */
const verifyBuyPackTransaction = async (txHash, userAddress, collection) => {
  let provider;
  try {
    provider = await withTimeout(getActiveProvider(5000), 6000, 'RPC connection');
  } catch (err) {
    const e = new Error('RPC không phản hồi — không thể xác minh giao dịch on-chain');
    e.code = 'VERIFY_TIMEOUT';
    throw e;
  }

  let receipt;
  try {
    receipt = await withTimeout(
      waitForTransactionReceipt(provider, txHash, 12, 2000),
      30000,
      'waitForReceipt'
    );
  } catch (err) {
    const e = new Error('Timeout chờ receipt giao dịch');
    e.code = 'VERIFY_TIMEOUT';
    throw e;
  }

  if (!receipt || receipt.status !== 1) {
    throw new Error('Giao dịch thất bại hoặc không tìm thấy trên chain');
  }

  const addresses = loadDeployment();
  const factory = addresses?.PackFactory?.toLowerCase();
  if (!factory || receipt.to?.toLowerCase() !== factory) {
    throw new Error('Transaction is not a PackFactory buyPack');
  }

  const tx = await provider.getTransaction(txHash);
  if (tx.from.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error('Transaction sender does not match wallet');
  }

  const expected = getExpectedPackPriceWei(collection);
  if (tx.value < expected) {
    throw new Error('Incorrect payment amount');
  }

  const contract = await getPackFactoryRead();
  const packs = await contract.getUserPacks(userAddress);
  const onChainPackIndex = Number(packs.length) - 1;
  if (onChainPackIndex < 0) {
    throw new Error('No pack found on chain for user');
  }

  return { onChainPackIndex, receipt };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseCardMintedTokenId = (receipt) => {
  try {
    const addresses = loadDeployment();
    const artifact = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../../artifacts/contracts/PokemonCard.sol/PokemonCard.json'),
        'utf-8'
      )
    );
    const cardAddress = addresses?.PokemonCard?.toLowerCase();
    const iface = new ethers.Interface(artifact.abi);
    for (const log of receipt.logs) {
      if (cardAddress && log.address.toLowerCase() !== cardAddress) continue;
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'CardMinted') {
        return Number(parsed.args.tokenId ?? parsed.args[0]);
      }
    }
  } catch (err) {
    console.warn('parseCardMintedTokenId:', err.message);
  }
  return null;
};

/**
 * Mint từng lá (tx riêng, cách vài giây) — Snowtrace/MetaMask index ảnh ổn định hơn batch 1 tx
 */
const mintPackOnChain = async (userAddress, onChainPackIndex, collection, cards) => {
  const { buildJsonIpfsUri } = require('./ipfsUriService');
  const contract = await getPackFactoryWrite();
  const staggerMs = parseInt(process.env.MINT_STAGGER_MS || '6000', 10);

  const markTx = await contract.markPackOpened(userAddress, onChainPackIndex);
  await markTx.wait();

  const tokenIds = [];
  let lastTxHash = markTx.hash;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const ipfsUri = buildJsonIpfsUri(collection, card.id);
    const tx = await contract.mintPackCard(
      userAddress,
      onChainPackIndex,
      collection.toUpperCase(),
      card.id,
      card.name,
      card.rarity,
      ipfsUri
    );
    const receipt = await tx.wait();
    lastTxHash = receipt.hash;
    const tokenId = parseCardMintedTokenId(receipt);
    if (tokenId != null) tokenIds.push(tokenId);
    if (i < cards.length - 1) await sleep(staggerMs);
  }

  return { txHash: lastTxHash, tokenIds };
};

const parsePackOpenedTokenIds = (receipt) => {
  try {
    const addresses = loadDeployment();
    const artifact = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../../artifacts/contracts/PackFactory.sol/PackFactory.json'),
        'utf-8'
      )
    );
    const factoryAddress = addresses?.PackFactory?.toLowerCase();
    const iface = new ethers.Interface(artifact.abi);

    for (const log of receipt.logs) {
      if (factoryAddress && log.address.toLowerCase() !== factoryAddress) continue;
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'PackOpened') {
        const ids = parsed.args.cardTokenIds ?? parsed.args[2];
        return [...ids].map((id) => Number(id));
      }
    }
  } catch (err) {
    console.warn('parsePackOpenedTokenIds:', err.message);
  }
  return [];
};

module.exports = {
  loadDeployment,
  verifyBuyPackTransaction,
  mintPackOnChain,
  getExpectedPackPriceWei,
};
