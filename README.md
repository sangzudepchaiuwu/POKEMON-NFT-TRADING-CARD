<h1 align="center">HỆ THỐNG PHÁT HÀNH, MỞ THẺ NGẪU NHIÊN VÀ MARKETPLACE GIAO DỊCH THẺ BÀI (Pokemon)</h1>

<div align="center">
<p align="center">
  <img src="Static/Logo_DAI_NAM.png" alt="DaiNam University Logo" width="200"/>
  <img src="Static/LogoAIoTLab.png" alt="AIoTLab Logo" width="170"/>
</p>

[![Avalanche Fuji](https://img.shields.io/badge/Network-Avalanche%20Fuji-red?style=for-the-badge)](https://testnet.snowtrace.io/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue?style=for-the-badge)](https://docs.soliditylang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend-green?style=for-the-badge)](https://expressjs.com/)
[![Web3.js](https://img.shields.io/badge/Web3.js-Blockchain-orange?style=for-the-badge)](https://web3js.readthedocs.io/)

[![Made with Node.js](https://img.shields.io/badge/Node.js-16+-green?style=for-the-badge)](https://nodejs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-Smart%20Contracts-yellow?style=for-the-badge)](https://hardhat.org/)
[![NFT Supported](https://img.shields.io/badge/NFT-ERC721-9cf?style=for-the-badge)](https://eips.ethereum.org/EIPS/eip-721)

</div>

---

## 🌟 Giới thiệu

**Pokemon NFT Card Game** là một hệ thống trò chơi thẻ Pokémon độc đáo chạy trên blockchain Avalanche Fuji Testnet. Người chơi có thể:
- 🎴 Mở booster packs để nhận thẻ Pokémon ngẫu nhiên
- 💰 Mua/bán thẻ trên Marketplace
- 🏆 Quản lý bộ sưu tập cá nhân
- ⛓️ Sở hữu thẻ dưới dạng NFT (ERC-721) thực sự

Hệ thống kết hợp **Smart Contracts** (Solidity), **API Backend** (Express.js), và **Web3 Integration** để tạo trải nghiệm blockchain đầy đủ.

---

## 🚀 Tính Năng Chính

### 🎴 **Hệ Thống Thẻ Pokémon**
- **Nhiều Series Pokémon:**
  - 🔴 **NEO Series** (Bản gốc cổ điển)
  - ⚡ **SWSH Series** (Sword & Shield)
  - 📊 Dữ liệu 1000+ thẻ từ API Pokémon TCG
  
### 📦 **Booster Packs & Pull System**
- **Mở Pack Ngẫu Nhiên:**
  - Mỗi pack chứa 5-10 thẻ random
  - Hệ thống Rarity: Common → Rare → Ultra Rare → Secret Rare
  - Xác suất được thiết kế cân bằng

### 💼 **Marketplace & Trading**
- **Mua/Bán Thẻ:**
  - Đăng danh sách bán thẻ cá nhân
  - Duyệt danh sách thẻ trên market
  - Thanh toán bằng AVAX (tiền điện tử Avalanche)
  - Smart contract xử lý giao dịch tự động
  
### 🎨 **Quản Lý Bộ Sưu Tập**
- Xem tất cả thẻ sở hữu
- Thống kê: tổng thẻ, series, rarity
- Chi tiết từng thẻ: hình ảnh, chỉ số, mô tả

### ⚙️ **Smart Contracts**
- **PokemonCard.sol** - ERC-721 NFT cho thẻ
- **PackFactory.sol** - Xử lý mở pack & random
- **Marketplace.sol** - Quản lý giao dịch buy/sell

### 📊 **Dashboard & Analytics**
- Giao diện web thân thiện
- Hiển thị giá thị trường real-time
- Thống kê collections & market activity

---

## 📁 Cấu Trúc Dự Án

```
pokemon-nft-blockchain/
│
├── server.js                   # 🔧 Điểm khởi động Express server
├── hardhat.config.js           # ⛓️ Cấu hình Hardhat & mạng
├── package.json                # 📦 Dependencies Node.js
│
├── contracts/                  # 📜 Smart Contracts Solidity
│   ├── PokemonCard.sol         # NFT ERC-721
│   ├── PackFactory.sol         # Booster pack system
│   └── Marketplace.sol         # Trading marketplace
│
├── scripts/                    # 🚀 Deploy & utility scripts
│   ├── deploy.js               # Deploy contracts
│   ├── deploy-marketplace.js   # Deploy marketplace
│   ├── sync-card-cache.js      # Sync dữ liệu thẻ
│   └── inspect-listings.js     # Kiểm tra danh sách
│
├── routes/                     # 🛣️ API Routes
│   ├── cards.js                # /api/cards - Thẻ
│   ├── packs.js                # /api/packs - Booster packs
│   ├── marketplace.js          # /api/marketplace - Market
│   ├── inventory.js            # /api/inventory - Bộ sưu tập
│   ├── metadata.js             # /api/metadata - Chi tiết thẻ
│   └── config.js               # /api/config - Cấu hình
│
├── src/                        # 💼 Dịch vụ Backend
│   ├── database/
│   │   └── db.js               # SQLite database init
│   └── services/
│       ├── blockchainService.js     # Web3 & contract interaction
│       ├── cardService.js           # Card logic
│       ├── packService.js           # Pack opening logic
│       ├── marketplaceService.js    # Marketplace operations
│       ├── inventoryService.js      # User inventory
│       ├── cardCacheService.js      # Card data cache
│       ├── metadataService.js       # Metadata handling
│       └── ipfsUriService.js        # IPFS integration
│
├── public/                     # 🌐 Frontend Web
│   ├── index.html              # Trang chính
│   ├── css/
│   │   ├── theme.css           # Styling chính
│   │   └── pack-animation.css  # Animation khi mở pack
│   └── js/
│       ├── ui.js               # UI interactions
│       ├── api.js              # API calls
│       ├── web3-config.js      # Web3 config
│       ├── pack-animation.js   # Open pack animation
│       ├── card-detail-modal.js # Chi tiết thẻ modal
│       ├── marketplace.js      # Market interactions
│       └── contract-abis.js    # Contract ABIs
│
├── artifacts/                  # 🏗️ Build outputs
│   ├── contracts/              # Compiled ABIs
│   └── build-info/             # Deployment info
│
├── downloaded_series/          # 📥 Dữ liệu series Pokémon
│   ├── neo/                    # NEO series data
│   │   ├── series.json
│   │   ├── sets.json
│   │   └── cards/              # Thẻ NEO
│   └── swsh/                   # SWSH series data
│       ├── series.json
│       ├── sets.json
│       └── cards/              # Thẻ SWSH
│
├── pack_images/                # 🎨 Pack artwork
│   ├── neo/
│   └── swsh/
│
├── data/                       # 📊 Cache dữ liệu
│   └── card-images/            # Hình ảnh thẻ
│
└── deployment-fuji.json        # 📋 Deployment config
```

---

## ⚙️ Công Nghệ Sử Dụng

| Công Nghệ | Mục Đích |
|-----------|---------|
| **Node.js 16+** | Runtime JavaScript backend |
| **Express.js** | Web framework & API server |
| **Solidity 0.8.20** | Smart contracts ERC-721 |
| **Hardhat** | Blockchain development toolkit |
| **Web3.js** | Tương tác blockchain |
| **Ethers.js** | Contract interaction |
| **SQLite3** | Database cục bộ |
| **Avalanche Fuji** | Testnet blockchain |
| **OpenZeppelin** | ERC-721 & security libraries |

---

## 🖥️ Cài Đặt & Chạy Chương Trình

### 1️⃣ **Clone Repository**
```bash
git clone <repo-url>
cd pokemon-nft-blockchain
```

### 2️⃣ **Cài Node Modules**
```bash
npm install
```

### 3️⃣ **Cấu Hình Environment Variables**
Tạo file `.env` trong thư mục gốc:
```env
# Blockchain Network
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PRIVATE_KEY=your_wallet_private_key_here
DEPLOYER_ADDRESS=your_wallet_address_here

# Server
PORT=8080
NODE_ENV=development

# Database
DATABASE_PATH=./data/pokemon.db

# IPFS (nếu sử dụng)
IPFS_API_URL=https://api.pinata.cloud/pinning/pinFileToIPFS
IPFS_API_KEY=your_pinata_key

# Market Config
NETWORK_ID=43113
CHAIN_ID=43113
```

### 4️⃣ **Deploy Smart Contracts**
```bash
# Deploy contracts lên Avalanche Fuji
npm run deploy-contracts

# Output sẽ lưu addresses trong deployment-fuji.json
```

### 5️⃣ **Đồng bộ Dữ Liệu Pokémon**
```bash
# Sync từ file tĩnh (nhanh hơn)
npm run sync-cards

# Hoặc sync từ Pinata IPFS
npm run sync-cards-pinata
```

### 6️⃣ **Chạy Server**
```bash
# Chế độ development (với auto-reload)
npm run dev

# Hoặc chế độ production
npm start
```

**Truy cập:** `http://localhost:8080`

---

## 📖 Hướng Dẫn Sử Dụng

### 🎮 **Trang Chính**
1. Kết nối MetaMask wallet (testnet Avalanche Fuji)
2. Xem danh sách available packs
3. Chọn pack muốn mở

### 📦 **Mở Booster Pack**
1. Nhấn **"Mở Pack"**
2. Phê duyệt giao dịch trên MetaMask
3. Xem animation khi mở pack
4. Nhận 5-10 thẻ Pokémon ngẫu nhiên
5. Thẻ được lưu trong NFT wallet

### 💼 **Marketplace**
1. Nhấn tab **"Marketplace"**
2. **Xem thẻ bán:**
   - Duyệt danh sách theo series, rarity
   - Xem chi tiết + giá
3. **Mua thẻ:**
   - Chọn thẻ muốn mua
   - Phê duyệt giao dịch trên MetaMask
4. **Bán thẻ:**
   - Vào **"Bộ Sưu Tập"**
   - Chọn thẻ, nhập giá bán
   - Đăng danh sách

### 🏆 **Bộ Sưu Tập**
1. Nhấn tab **"Bộ Sưu Tập"**
2. Xem tất cả thẻ sở hữu
3. Thống kê: tổng số, theo series, theo rarity
4. Chi tiết từng thẻ: ID, hình ảnh, thuộc tính

---

## 📊 API Endpoints

### 🎴 Cards
| Endpoint | Phương thức | Mục đích |
|----------|-----------|---------|
| `/api/cards` | GET | Lấy danh sách tất cả thẻ |
| `/api/cards/:id` | GET | Chi tiết thẻ theo ID |
| `/api/cards/series/:series` | GET | Lấy thẻ theo series |
| `/api/cards/rarity/:rarity` | GET | Lấy thẻ theo độ hiếm |

### 📦 Packs
| Endpoint | Phương thức | Mục đích |
|----------|-----------|---------|
| `/api/packs` | GET | Danh sách available packs |
| `/api/packs/open` | POST | Mở pack (yêu cầu wallet) |
| `/api/packs/history/:address` | GET | Lịch sử mở pack của user |

### 💰 Marketplace
| Endpoint | Phương thức | Mục đích |
|----------|-----------|---------|
| `/api/marketplace/listings` | GET | Danh sách đang bán |
| `/api/marketplace/listings` | POST | Đăng danh sách bán |
| `/api/marketplace/buy/:listingId` | POST | Mua thẻ |
| `/api/marketplace/cancel/:listingId` | POST | Hủy danh sách |

### 🏆 Inventory
| Endpoint | Phương thức | Mục đích |
|----------|-----------|---------|
| `/api/inventory/:address` | GET | Bộ sưu tập của user |
| `/api/inventory/stats/:address` | GET | Thống kê bộ sưu tập |

### 📋 Metadata
| Endpoint | Phương thức | Mục đích |
|----------|-----------|---------|
| `/api/metadata/:tokenId` | GET | ERC-721 metadata |

### ⚙️ Config
| Endpoint | Phương thức | Mục đích |
|----------|-----------|---------|
| `/api/config/contracts` | GET | Addresses smart contracts |
| `/api/config/network` | GET | Thông tin mạng |

### Ví dụ Request

**Lấy danh sách thẻ NEO series:**
```bash
curl http://localhost:8080/api/cards/series/neo
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "neo2-1",
      "name": "Bulbasaur",
      "series": "neo",
      "rarity": "common",
      "image": "https://...",
      "price": 5.5
    },
    ...
  ]
}
```

**Lấy bộ sưu tập của user:**
```bash
curl http://localhost:8080/api/inventory/0x1234567890abcdef
```

---

## ⚡ Tối Ưu Hiệu Năng

### 🖥️ Sử dụng Avalanche C-Chain
- Cấu hình RPC endpoint nhanh nhất
- Thiết lập gas price phù hợp

### 💾 Caching Dữ Liệu
```javascript
// Sử dụng SQLite cache thay vì gọi API mỗi lần
const cards = await cardCacheService.getCardsByRarity('rare');
```

### 📹 Optimization Images
- Hình ảnh thẻ được compress
- Sử dụng format WebP khi có thể

### 🔄 Database Indexing
- Indexes trên frequently-queried columns
- Query optimization cho Marketplace listings

---

## 🔧 Cấu Hình Smart Contracts

### Đổi Network
Sửa trong `.env`:
```env
AVALANCHE_RPC_URL=<new_rpc_url>
NETWORK_ID=<chain_id>
```

### Điều Chỉnh Pack Rarity
Sửa trong `contracts/PackFactory.sol`:
```solidity
// Tỷ lệ hiếm
uint256 commonChance = 70;      // 70%
uint256 rareChance = 20;        // 20%
uint256 ultraRareChance = 9;    // 9%
uint256 secretRareChance = 1;   // 1%
```

### Thay Đổi Giá Pack
Trong `routes/packs.js`:
```javascript
const PACK_PRICES = {
  'basic': web3.utils.toWei('10', 'ether'),    // 10 AVAX
  'premium': web3.utils.toWei('25', 'ether'),  // 25 AVAX
  'deluxe': web3.utils.toWei('50', 'ether'),   // 50 AVAX
};
```

---

## 🧪 Testing

### Chạy Test Suite
```bash
npm test
```

### Test Smart Contracts
```bash
npx hardhat test
```

### Test API Endpoints
```bash
# Ví dụ: test GET /api/cards
curl -X GET http://localhost:8080/api/cards

# Test POST (mở pack)
curl -X POST http://localhost:8080/api/packs/open \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x...", "packType":"basic"}'
```

---

## 📥 Dữ Liệu Pokémon

### Nguồn Dữ Liệu
- **Pokemon TCG API** - https://pokemontcg.io/
- **Pokémon Official** - https://www.pokemon.com/

### Cấu Trúc Dữ Liệu Thẻ
```json
{
  "id": "neo2-1",
  "number": "001",
  "set": "NEO Genesis",
  "series": "neo",
  "name": "Bulbasaur",
  "rarity": "common",
  "hp": 40,
  "type": "grass",
  "image": {
    "small": "https://...",
    "large": "https://..."
  },
  "cardmarket": {
    "url": "...",
    "updatedAt": "2024-01-01",
    "prices": {
      "avg": 5.50,
      "trend": 0.02
    }
  }
}
```

---

## 🔐 Security

### Best Practices
- ✅ Private keys được lưu trong `.env` (không commit)
- ✅ Contracts được audit trên OpenZeppelin
- ✅ CORS configured cho trusted origins
- ✅ Rate limiting trên API endpoints
- ✅ Input validation trên mọi requests

### Checklist Pre-Launch
- [ ] Test tất cả contracts trên testnet
- [ ] Verify contracts trên Snowtrace explorer
- [ ] Setup environment variables
- [ ] Database backup strategy
- [ ] Monitoring & logging setup
- [ ] Wallet security review

---

## 📚 Tài Liệu Thêm

### Blockchain
- [Avalanche Documentation](https://docs.avax.network/)
- [Hardhat Guide](https://hardhat.org/hardhat-runner/docs/getting-started)
- [Solidity Docs](https://docs.soliditylang.org/)

### Web3
- [Web3.js Docs](https://web3js.readthedocs.io/)
- [Ethers.js Docs](https://docs.ethers.org/)
- [MetaMask Documentation](https://metamask.io/download.html)

### Pokémon
- [Pokemon TCG API](https://docs.pokemontcg.io/)
- [Card Database](https://scryfall.com/search?q=game%3Apokemon)

---

## 🤝 Contribution

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Mở Pull Request

---

## 📝 License

MIT License - xem file [LICENSE](LICENSE) để chi tiết.

---

## ❓ FAQ

### Q: Làm sao kết nối MetaMask?
**A:** Truy cập trang web, browser sẽ tự động prompt kết nối. Nếu không, nhấn nút "Connect Wallet".

### Q: Làm sao lấy AVAX testnet?
**A:** Sử dụng [Avalanche Faucet](https://faucet.avax.network/) - nhập wallet address để nhận testnet AVAX.

### Q: Thẻ mua được được lưu ở đâu?
**A:** Thẻ được lưu trong smart contract (on-chain NFT). Có thể xem trong MetaMask hoặc NFT explorers.

### Q: Có thể chuyển thẻ cho người khác không?
**A:** Vâng, dùng tính năng Transfer trong Marketplace, hoặc gửi trực tiếp từ MetaMask NFT gallery.

---

<div align="center">

**⭐ Nếu dự án hữu ích, hãy cho một ⭐ star!**
</div>

<img src="Screenshot 2026-06-04 141736.png" width="250"/>
<img src="Screenshot 2026-06-04 141747.png" width="250"/>
