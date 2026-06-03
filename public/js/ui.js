// Global State
let currentCollection = 'NEO';
let currentCardIndex = 0;
let allCards = [];
let dropRateInfo = {};

/**
 * Cập nhật ảnh booster pack hiển thị trong panel "Mở Pack"
 * theo collection đang chọn (dùng chung pack-images với overlay animation)
 */
function updatePackPreview() {
  const img = document.getElementById('packPreviewImg');
  const name = document.getElementById('packPreviewName');
  if (!img) return;
  const col = (currentCollection || 'NEO').toUpperCase();
  const url =
    window.PackAnimation && typeof PackAnimation.getPackImageUrl === 'function'
      ? PackAnimation.getPackImageUrl(col)
      : `/pack-images/${col.toLowerCase()}/${col === 'SWSH' ? 'swsh1' : 'neo2'}.jpg`;
  img.src = url;
  img.alt = `${col} booster pack`;
  if (name) name.textContent = col;
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert active alert-${type}`;
  alertBox.textContent = message;
  
  setTimeout(() => {
    alertBox.classList.remove('active');
  }, 5000);
}

/**
 * Initialize UI
 */
document.addEventListener('DOMContentLoaded', () => {
  // Collection selector
  document.querySelectorAll('.collection-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget;
      document.querySelectorAll('.collection-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');
      currentCollection = target.dataset.collection;
      currentCardIndex = 0;
      hidePackResultPanel();
      updatePackPreview();
      await loadCollectionCards();
      await loadDropRates();
    });
  });

  updatePackPreview();

  // Tab switcher
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      e.target.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');

      if (tabName === 'inventory') {
        loadInventory();
      }
      if (tabName === 'marketplace') {
        Marketplace.loadBrowse();
      }
    });
  });

  // Pack buttons
  document.getElementById('buyPackBtn').addEventListener('click', handleBuyPack);
  document.getElementById('simulateBtn').addEventListener('click', handleSimulatePack);
  document.getElementById('prevCardBtn').addEventListener('click', previousCard);
  document.getElementById('nextCardBtn').addEventListener('click', nextCard);

  // Wallet button handled by web3-config.js (updateWalletUI)

  // Load initial data
  loadCollectionCards();
  loadDropRates();
  refreshMyPacks();
  loadInventory();
});

/** Thẻ NFT đã mở / đã mint */
async function loadInventory() {
  const el = document.getElementById('inventoryContent');
  const loading = document.getElementById('inventoryLoading');
  if (!el) return;

  if (!window.userAccount) {
    el.innerHTML = '<p style="color:#999;">Kết nối ví để xem inventory</p>';
    if (loading) loading.classList.remove('active');
    return;
  }

  try {
    if (loading) loading.classList.add('active');
    const res = await getUserInventory(window.userAccount);
    const cards = res.cards || [];

    if (cards.length === 0) {
      el.innerHTML =
        '<p style="color:#999;">Chưa có thẻ. Mua pack → Mở Pack để thêm vào inventory.</p>';
      return;
    }

    // Cache cards để callback (click/list) lấy lại
    window._inventoryCards = cards;

    el.innerHTML = `
      <p class="inventory-meta">${cards.length} thẻ · ví <code>${window.userAccount.substring(0, 6)}…${window.userAccount.slice(-4)}</code></p>
      <div class="marketplace-grid">
        ${cards
          .map((card, i) => {
            const rColor = dropRateInfo.colors?.[card.rarity] || '#FFFFFF';
            const rGlow = hexToRgba(rColor, 0.45);
            let sellBtn;
            if (card.listingId) {
              sellBtn = `<button class="inventory-list-btn listed" disabled><i data-lucide="tag"></i> Đang bán · ${Number(card.listingPrice).toFixed(4)} AVAX</button>`;
            } else if (card.nftTokenId == null) {
              sellBtn = `<button class="inventory-list-btn" disabled title="Chờ mint NFT xong"><i data-lucide="loader-circle"></i> Chờ mint NFT</button>`;
            } else {
              sellBtn = `<button class="inventory-list-btn" data-inv-list="${i}"><i data-lucide="tag"></i> Đăng bán</button>`;
            }
            return `
          <div class="marketplace-item inventory-card" data-inv-detail="${i}" style="--rarity-color:${rColor};--rarity-glow:${rGlow};cursor:pointer;">
            <img src="${card.image}" alt="${card.name}"
              onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22>No image</text></svg>'">
            <div class="inventory-info">
              <div class="inventory-name">${card.name}</div>
              <div class="inventory-sub">
                <span class="inventory-collection">${card.collection}</span>
                <span class="inventory-rarity-pill" style="color:${rColor};border-color:${rColor};">${card.rarity}</span>
              </div>
              <div class="inventory-id">${card.id}</div>
              ${
                card.nftTokenId != null
                  ? `<a href="${card.nftExplorerUrl || '#'}" target="_blank" rel="noopener" class="inventory-nft" onclick="event.stopPropagation()">NFT #${card.nftTokenId} <i data-lucide="external-link"></i></a>`
                  : `<span class="inventory-status">${card.mintStatus === 'minting' ? 'Đang mint…' : card.ownedVia === 'bought' ? 'Đã mua' : ''}</span>`
              }
              ${sellBtn}
            </div>
          </div>`;
          })
          .join('')}
      </div>`;

    // Click vào thẻ → open card detail modal
    el.querySelectorAll('[data-inv-detail]').forEach((node) => {
      node.addEventListener('click', (e) => {
        if (e.target.closest('.inventory-list-btn') || e.target.closest('.inventory-nft')) return;
        const idx = Number(node.dataset.invDetail);
        const card = window._inventoryCards?.[idx];
        if (card) CardDetailModal.show(card, card.collection, dropRateInfo.colors || {});
      });
    });

    // Click nút List → mở list-for-sale modal
    el.querySelectorAll('[data-inv-list]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.invList);
        const card = window._inventoryCards?.[idx];
        if (card) Marketplace.promptListForSale(card);
      });
    });

    if (window.renderLucideIcons) window.renderLucideIcons();
  } catch (e) {
    el.innerHTML = `<p style="color:red;font-size:12px;">${e.message}</p>`;
  } finally {
    if (loading) loading.classList.remove('active');
  }
}

/** Pack đã mua — chờ user mở */
async function refreshMyPacks() {
  const el = document.getElementById('myPacksList');
  if (!el) return;
  if (!window.userAccount) {
    el.innerHTML = '<p style="color:#999;font-size:13px;">Kết nối ví để xem pack của bạn</p>';
    return;
  }
  try {
    const res = await getMyPacks(window.userAccount);
    const packs = res.packs || [];
    if (packs.length === 0) {
      el.innerHTML = '<p style="color:#999;font-size:13px;">Chưa có pack. Mua pack ở trên.</p>';
      return;
    }
    el.innerHTML = packs
      .map(
        (p) => `
      <div class="my-pack-item ${p.status === 'unopened' ? 'unopened' : p.status === 'minting' ? 'minting' : 'minted'}">
        <div class="my-pack-header">
          <div class="my-pack-title">${p.collection} Pack <span class="my-pack-id">#${p.id}</span></div>
          <span class="my-pack-status">${p.status}</span>
        </div>
        <div class="my-pack-date">${new Date(p.created_at).toLocaleString()}</div>
        ${
          p.status === 'unopened'
            ? `<button class="btn btn-secondary btn-full" style="margin-top:10px;" onclick="handleOpenPack(${p.id})"><i data-lucide="package-open"></i> Mở Pack</button>`
            : p.status === 'minting'
            ? '<div class="my-pack-minting"><i data-lucide="loader-circle"></i> NFT đang mint nền…</div>'
            : ''
        }
      </div>`
      )
      .join('');

    if (window.renderLucideIcons) window.renderLucideIcons();
  } catch (e) {
    el.innerHTML = `<p style="color:red;font-size:12px;">${e.message}</p>`;
  }
}

async function handleOpenPack(packDbId) {
  if (!window.userAccount) {
    showAlert('Vui lòng kết nối ví', 'error');
    return;
  }
  try {
    showAlert('Đang mở pack…', 'info');
    const result = await openPack(packDbId, window.userAccount);
    const collection = result.pack?.collection || currentCollection;
    await PackAnimation.showPackOpenReveal(result.cards, collection, dropRateInfo.colors || {});
    displayPackResult(result.cards, true);
    showAlert(result.message || 'Đã mở pack!', 'success');
    refreshMyPacks();
    loadInventory();
  } catch (e) {
    showAlert('Lỗi mở pack: ' + e.message, 'error');
  }
}

/**
 * Load cards from collection
 */
async function loadCollectionCards() {
  try {
    const loading = document.getElementById('cardLoading');
    loading.classList.add('active');
    
    const response = await getCards(currentCollection);
    allCards = response.cards || [];
    
    if (allCards.length > 0) {
      displayCard(0);
    } else {
      showAlert('Không có cards trong collection này', 'error');
    }
    
    loading.classList.remove('active');
  } catch (error) {
    console.error('Error loading cards:', error);
    showAlert('Lỗi tải cards: ' + error.message, 'error');
  }
}

/**
 * Load drop rates
 */
async function loadDropRates() {
  try {
    const response = await getDropRates(currentCollection);
    dropRateInfo = response;
    
    const infoDiv = document.getElementById('dropRateInfo');
    let html = '<table class="drop-rate-table"><tr><th>Rarity</th><th>%</th></tr>';

    for (const [rarity, rate] of Object.entries(response.dropRates)) {
      const percent = (rate * 100).toFixed(2);
      const rColor = response.colors?.[rarity] || '#ffffff';
      html += `<tr>
        <td><span class="drop-rate-dot" style="background:${rColor};box-shadow:0 0 8px ${rColor};"></span><span style="color:${rColor};font-weight:600;">${rarity}</span></td>
        <td>${percent}%</td>
      </tr>`;
    }

    html += '</table>';
    infoDiv.innerHTML = html;
  } catch (error) {
    console.error('Error loading drop rates:', error);
  }
}

/**
 * Display card
 */
function displayCard(index) {
  if (index < 0 || index >= allCards.length) return;
  
  currentCardIndex = index;
  const card = allCards[index];
  const cardDisplay = document.getElementById('cardDisplay');
  const cardDetails = document.getElementById('cardDetails');
  
  // Display image with loading state
  let imageHtml = '';
  if (card.image) {
    const fallbackSvg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="350">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="Arial" font-size="18">
          No Image
        </text>
      </svg>`
    );
    imageHtml = `
      <div class="card-image-wrap" style="position:relative;min-height:250px;display:flex;align-items:center;justify-content:center;">
        <div class="img-loading" style="position:absolute;color:#999;font-size:13px;">Đang tải ảnh...</div>
        <img
          src="${card.image}"
          alt="${card.name}"
          class="card-image"
          loading="lazy"
          decoding="async"
          style="opacity:0;transition:opacity 0.3s;"
          onload="this.style.opacity=1;this.previousElementSibling.style.display='none';"
          onerror="this.onerror=null;this.style.opacity=1;this.previousElementSibling.style.display='none';this.src='data:image/svg+xml,${fallbackSvg}'"
        >
      </div>`;
  } else {
    imageHtml = `<div style="width: 250px; height: 350px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 10px auto; border-radius: 8px;">No Image</div>`;
  }
  
  cardDisplay.innerHTML = `
    <h3>${card.name}</h3>
    ${imageHtml}
    <p style="color: #999; font-size: 12px;">${card.id}</p>
  `;
  
  const rarityColor = dropRateInfo.colors?.[card.rarity] || '#FFFFFF';
  const rarityGlow = hexToRgba(rarityColor, 0.18);
  cardDetails.innerHTML = `
    <div class="card-stat rarity-stat" style="border-left-color:${rarityColor};background:linear-gradient(90deg, ${rarityGlow}, transparent);">
      <div class="card-stat-label">Rarity</div>
      <div class="card-stat-value" style="color:${rarityColor};">${card.rarity}</div>
    </div>
    <div class="card-stat">
      <div class="card-stat-label">HP</div>
      <div class="card-stat-value">${card.hp || 'N/A'}</div>
    </div>
    <div class="card-stat">
      <div class="card-stat-label">Types</div>
      <div class="card-stat-value">${card.types?.join(', ') || 'N/A'}</div>
    </div>
    <div class="card-stat">
      <div class="card-stat-label">Stage</div>
      <div class="card-stat-value">${card.stage || 'N/A'}</div>
    </div>
  `;
  
  // Update navigation buttons
  document.getElementById('prevCardBtn').disabled = index === 0;
  document.getElementById('nextCardBtn').disabled = index === allCards.length - 1;

  // Prefetch next card image for faster browsing
  const nextCard = allCards[index + 1];
  if (nextCard?.image) {
    const preload = new Image();
    preload.src = nextCard.image;
  }
}

/**
 * Navigate to previous card
 */
function previousCard() {
  if (currentCardIndex > 0) {
    displayCard(currentCardIndex - 1);
  }
}

/**
 * Navigate to next card
 */
function nextCard() {
  if (currentCardIndex < allCards.length - 1) {
    displayCard(currentCardIndex + 1);
  }
}

/**
 * Handle buy pack (calls blockchain)
 */
async function handleBuyPack() {
  if (!window.userAccount) {
    showAlert('Vui lòng kết nối ví trước', 'error');
    return;
  }

  try {
    document.getElementById('buyPackBtn').disabled = true;
    document.getElementById('buyPackBtn').textContent = 'Đang xử lý...';

    const balance = await getUserBalance();
    const packPrice = 0.5;

    if (parseFloat(balance) < packPrice) {
      showAlert(`Số dư không đủ. Cần ${packPrice} AVAX`, 'error');
      return;
    }

    const { txHash } = await buyPackOnChain(currentCollection);
    await confirmPackPurchase(currentCollection, window.userAccount, txHash);

    await PackAnimation.showPurchaseSuccess(currentCollection);
    showAlert('✅ Đã mua pack! Bấm "Mở Pack" bên dưới.', 'success');
    refreshMyPacks();
  } catch (error) {
    console.error('Error buying pack:', error);
    showAlert('Lỗi mua pack: ' + error.message, 'error');
  } finally {
    document.getElementById('buyPackBtn').disabled = false;
    document.getElementById('buyPackBtn').textContent = 'Mua Pack';
  }
}

/**
 * Handle simulate pack opening (demo)
 */
async function handleSimulatePack() {
  try {
    document.getElementById('simulateBtn').disabled = true;
    document.getElementById('simulateBtn').textContent = 'Đang tạo pack...';
    
    const count = parseInt(document.getElementById('simulateCount').value) || 1;
    
    const response = await simulatePacks(currentCollection, count);
    
    if (response.success && response.packs.length > 0) {
      const pack = response.packs[0];
      await PackAnimation.showPackOpenReveal(
        pack.cards,
        currentCollection,
        dropRateInfo.colors || {}
      );
      displayPackResult(pack.cards, true);
      showAlert(`✅ Đã mở ${count} pack! Xem kết quả ở dưới.`, 'success');
    }
    
  } catch (error) {
    console.error('Error simulating pack:', error);
    showAlert('Lỗi mở pack: ' + error.message, 'error');
  } finally {
    document.getElementById('simulateBtn').disabled = false;
    document.getElementById('simulateBtn').textContent = 'Mô Phỏng Mở Pack';
  }
}

/**
 * Rarity nào được coi là "shiny" (có hiệu ứng shimmer)
 */
const SHINY_RARITIES = new Set([
  'Rare',
  'Holo Rare',
  'Holo Rare V',
  'Holo Rare VMAX',
  'Ultra Rare',
  'Secret Rare',
]);

/**
 * Map rarity → tier hiệu ứng cho result panel (giữ đồng bộ với pack-animation.js)
 */
function rarityTierForResult(rarity) {
  const r = String(rarity || '').toLowerCase();
  if (
    r.includes('secret') ||
    r.includes('rainbow') ||
    r.includes('ultra') ||
    r.includes('vmax')
  )
    return 'legendary';
  if (r.includes('holo') || / v\b/.test(r) || / ex\b/.test(r)) return 'epic';
  if (r.includes('rare')) return 'rare';
  return '';
}

/**
 * Chuyển hex → rgba với alpha
 */
function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Ẩn card viewer (single card), hiện pack result panel
 */
function showPackResultPanel() {
  document.getElementById('cardViewerPanel').style.display = 'none';
  const panel = document.getElementById('packResultPanel');
  panel.hidden = false;
}

function hidePackResultPanel() {
  document.getElementById('cardViewerPanel').style.display = '';
  document.getElementById('packResultPanel').hidden = true;
}

/**
 * Display pack result
 */
function displayPackResult(cards, withImages = false) {
  const panel = document.getElementById('packResultPanel');

  const cardsHtml = cards
    .map((card, i) => {
      const rarityColor = dropRateInfo.colors?.[card.rarity] || '#FFFFFF';
      const rarityGlow = hexToRgba(rarityColor, 0.55);
      const shiny = SHINY_RARITIES.has(card.rarity) ? ' shiny' : '';
      const tier = rarityTierForResult(card.rarity);
      const imgBlock =
        withImages && card.image
          ? `<div class="pack-result-img-wrap"><img src="${card.image}" alt="${card.name}" loading="eager"></div>`
          : '';
      return `
        <div class="pack-result-card${shiny}" data-card-index="${i}" data-tier="${tier}" style="--rarity-color:${rarityColor};--rarity-glow:${rarityGlow};cursor:pointer;">
          ${imgBlock}
          <div class="pack-result-name" title="${card.name}">${card.name}</div>
          <div class="pack-result-rarity">${card.rarity}</div>
          <div class="pack-result-id">${card.id}</div>
        </div>`;
    })
    .join('');

  panel.innerHTML = `
    <div class="pack-result-header">
      <h3 class="pack-result-title"><i data-lucide="package-open"></i> Kết quả mở Pack <span class="pack-result-badge">${cards.length} thẻ</span></h3>
      <button type="button" class="pack-result-back" id="packResultBackBtn"><i data-lucide="arrow-left"></i> Quay lại Viewer</button>
    </div>
    <div class="pack-result-grid">${cardsHtml}</div>
    <p style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:10px;text-align:center;">Bấm vào thẻ để xem chi tiết</p>
    ${
      withImages
        ? `<div class="pack-result-footer"><span class="dot"></span> NFT đang được mint nền (metadata Pinata). Bạn không cần chờ.</div>`
        : ''
    }`;

  if (window.renderLucideIcons) window.renderLucideIcons();

  panel.querySelector('#packResultBackBtn').addEventListener('click', hidePackResultPanel);

  panel.querySelectorAll('.pack-result-card').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.cardIndex, 10);
      const card = cards[idx];
      if (card) CardDetailModal.show(card, currentCollection, dropRateInfo.colors || {});
    });
  });

  showPackResultPanel();
}

/**
 * Format AVAX
 */
function formatAvax(amount) {
  return parseFloat(amount).toFixed(4) + ' AVAX';
}
