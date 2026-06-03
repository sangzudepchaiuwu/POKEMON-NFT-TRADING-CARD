/**
 * Pack purchase & card flip reveal animations
 */
const PackAnimation = (() => {
  const PACK_IMAGE_BASE = '/pack-images';

  /** Default booster art per collection (matches active sets in rarity.js) */
  const DEFAULT_PACK_SET = {
    NEO: 'neo2',
    SWSH: 'swsh1',
  };

  let overlayEl = null;
  let purchaseScene = null;
  let openScene = null;
  let purchaseImg = null;
  let openImg = null;
  let openStage = null;
  let cardGrid = null;
  let flipHint = null;
  let flipProgress = null;
  let purchaseBtn = null;
  let openCloseBtn = null;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getPackImageUrl = (collection, setId) => {
    const col = (collection || 'NEO').toUpperCase();
    const set = (setId || DEFAULT_PACK_SET[col] || 'neo2').toLowerCase();
    return `${PACK_IMAGE_BASE}/${col.toLowerCase()}/${set}.jpg`;
  };

  const getCardBackUrl = () => `${PACK_IMAGE_BASE}/BackgroundCard.jpg`;

  const resolveCardImage = (card, collection) => {
    if (card.image) return card.image;
    const col = (collection || 'NEO').toUpperCase();
    return `/api/cards/cache/${col}/${card.id}/image`;
  };

  /**
   * Phân lớp rarity → tier hiệu ứng
   * legendary → secret/ultra/rainbow/vmax  → halo conic xoay + screen flash
   * epic      → holo rare / v / ex         → holographic shimmer + glow
   * rare      → rare thường                → burst + sparkle vàng
   * uncommon/common → không có hiệu ứng đặc biệt
   */
  const rarityToTier = (rarity) => {
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
    if (r.includes('uncommon')) return 'uncommon';
    return 'common';
  };

  const hexToRgba = (hex, alpha) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return `rgba(255,255,255,${alpha})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  /**
   * Screen flash khi mở ra thẻ legendary (ultra / secret rare)
   */
  const triggerLegendaryFlash = (color) => {
    let flash = document.getElementById('rarityFlashOverlay');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'rarityFlashOverlay';
      flash.className = 'rarity-flash-overlay';
      document.body.appendChild(flash);
    }
    flash.style.setProperty('--flash-color', color);
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 1100);
  };

  const ensureElements = () => {
    overlayEl = document.getElementById('packOverlay');
    purchaseScene = document.getElementById('packPurchaseScene');
    openScene = document.getElementById('packOpenScene');
    purchaseImg = document.getElementById('packPurchaseImg');
    openImg = document.getElementById('packOpenImg');
    openStage = document.getElementById('packOpenStage');
    cardGrid = document.getElementById('cardRevealGrid');
    flipHint = document.getElementById('flipHint');
    flipProgress = document.getElementById('flipProgress');
    purchaseBtn = document.getElementById('packDismissBtn');
    openCloseBtn = document.getElementById('packCloseBtn');
  };

  const showOverlay = () => {
    ensureElements();
    overlayEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const hideOverlay = () => {
    ensureElements();
    overlayEl.classList.remove('active');
    purchaseScene.classList.remove('active');
    openScene.classList.remove('active');
    document.body.style.overflow = '';
  };

  const resetOpenScene = () => {
    openStage.classList.remove('hidden');
    openStage.style.display = '';
    cardGrid.classList.add('hidden');
    cardGrid.classList.remove('stagger-in');
    cardGrid.innerHTML = '';
    openCloseBtn.classList.add('hidden');
    openImg.className = 'pack-img';
    if (flipHint) flipHint.textContent = 'Chạm vào từng lá để lật thẻ';
    if (flipProgress) flipProgress.textContent = '';
  };

  /**
   * Animation sau khi mua pack thành công
   * @returns {Promise<void>} resolves when user dismisses
   */
  const showPurchaseSuccess = (collection) => {
    ensureElements();
    resetOpenScene();

    return new Promise((resolve) => {
      purchaseScene.classList.add('active');
      openScene.classList.remove('active');

      const titleEl = document.getElementById('packPurchaseTitle');
      if (titleEl) {
        titleEl.innerHTML = `<i data-lucide="party-popper"></i> ${collection.toUpperCase()} Pack`;
      }

      purchaseImg.src = getPackImageUrl(collection);
      purchaseImg.alt = `${collection} booster pack`;
      purchaseImg.className = 'pack-img enter';

      purchaseBtn.disabled = false;
      purchaseBtn.innerHTML = '<i data-lucide="arrow-right"></i> Tiếp tục';

      showOverlay();
      if (window.renderLucideIcons) window.renderLucideIcons();

      const onDone = () => {
        purchaseBtn.removeEventListener('click', onDone);
        purchaseImg.classList.remove('enter');
        purchaseImg.classList.add('float');
        hideOverlay();
        resolve();
      };

      purchaseBtn.addEventListener('click', onDone);

      // Add float after enter animation
      purchaseImg.addEventListener(
        'animationend',
        () => {
          purchaseImg.classList.remove('enter');
          purchaseImg.classList.add('float');
        },
        { once: true }
      );
    });
  };

  const prefetchImages = (urls) => {
    urls.filter(Boolean).forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  };

  const buildFlipCard = (card, index, collection, rarityColors, onFlip) => {
    const wrap = document.createElement('div');
    wrap.className = 'flip-card-wrap';
    wrap.style.animationDelay = `${index * 0.08}s`;

    const rarityColor = rarityColors?.[card.rarity] || '#FFFFFF';
    const tier = rarityToTier(card.rarity);
    const frontImage = resolveCardImage(card, collection);

    wrap.dataset.tier = tier;
    wrap.style.setProperty('--rarity-color', rarityColor);
    wrap.style.setProperty('--rarity-glow', hexToRgba(rarityColor, 0.55));

    const flipCard = document.createElement('div');
    flipCard.className = 'flip-card';
    flipCard.dataset.index = String(index);

    flipCard.innerHTML = `
      <div class="flip-card-inner">
        <div class="flip-card-face flip-card-back">
          <img src="${getCardBackUrl()}" alt="Mặt sau thẻ" draggable="false">
        </div>
        <div class="flip-card-face flip-card-front">
          <img src="${frontImage}" alt="${card.name || 'Card'}" draggable="false"
            onerror="this.style.background='#333'">
        </div>
      </div>`;

    const info = document.createElement('div');
    info.className = 'flip-card-info';
    info.innerHTML = `
      <div class="flip-card-name" title="${card.name || ''}">${card.name || card.id}</div>
      <div class="flip-card-rarity" style="color:${rarityColor}">${card.rarity || ''}</div>
      <div class="flip-card-hint">Bấm để xem chi tiết</div>`;

    // Lớp hiệu ứng — chỉ tạo cho rare+ để tiết kiệm DOM cho thẻ common/uncommon
    let halo = null;
    let fxOverlay = null;
    if (tier === 'rare' || tier === 'epic' || tier === 'legendary') {
      halo = document.createElement('div');
      halo.className = 'fx-halo';
      halo.setAttribute('aria-hidden', 'true');

      fxOverlay = document.createElement('div');
      fxOverlay.className = 'fx-overlay';
      fxOverlay.setAttribute('aria-hidden', 'true');
      const sparkCount = tier === 'legendary' ? 12 : tier === 'epic' ? 10 : 8;
      const sparks = Array.from(
        { length: sparkCount },
        (_, i) => `<span class="fx-spark fx-spark-${i + 1}"></span>`
      ).join('');
      fxOverlay.innerHTML = `
        <div class="fx-burst"></div>
        <div class="fx-sparkles">${sparks}</div>
      `;
    }

    flipCard.addEventListener('click', () => {
      if (!flipCard.classList.contains('flipped')) {
        flipCard.classList.add('flipped');
        info.classList.add('visible');
        wrap.classList.add('revealed');
        if (tier === 'legendary') {
          // Đợi card flip qua nửa rồi mới flash để đồng bộ visual
          setTimeout(() => triggerLegendaryFlash(rarityColor), 280);
        }
        onFlip(index);
        return;
      }
      // Đã lật rồi → mở modal chi tiết
      CardDetailModal.show(card, collection, rarityColors);
    });

    if (halo) wrap.appendChild(halo);
    wrap.appendChild(flipCard);
    if (fxOverlay) wrap.appendChild(fxOverlay);
    wrap.appendChild(info);
    return wrap;
  };

  /**
   * Animation mở pack: rung pack → thẻ úp → lật từng lá
   * @returns {Promise<void>}
   */
  const showPackOpenReveal = (cards, collection, rarityColors = {}) => {
    ensureElements();

    return new Promise((resolve) => {
      purchaseScene.classList.remove('active');
      openScene.classList.add('active');
      resetOpenScene();

      const setId = cards[0]?.set;
      openImg.src = getPackImageUrl(collection, setId);
      openImg.alt = `${collection} pack`;
      openImg.className = 'pack-img enter';

      prefetchImages([
        getCardBackUrl(),
        getPackImageUrl(collection, setId),
        ...cards.map((c) => resolveCardImage(c, collection)),
      ]);

      showOverlay();
      if (window.renderLucideIcons) window.renderLucideIcons();

      let flippedCount = 0;
      const total = cards.length;

      const updateProgress = () => {
        if (flipProgress) {
          flipProgress.textContent = `Đã lật ${flippedCount}/${total} thẻ`;
        }
        if (flippedCount >= total) {
          if (flipHint) flipHint.textContent = 'Chúc mừng! Bạn đã mở hết pack.';
          openCloseBtn.classList.remove('hidden');
          openCloseBtn.innerHTML = '<i data-lucide="check"></i> Xem kết quả';
          if (window.renderLucideIcons) window.renderLucideIcons();
        }
      };

      const onFlip = () => {
        flippedCount += 1;
        updateProgress();
      };

      const revealCards = () => {
        openStage.style.display = 'none';
        cardGrid.classList.remove('hidden');
        cardGrid.classList.add('stagger-in');
        cardGrid.innerHTML = '';

        cards.forEach((card, i) => {
          cardGrid.appendChild(buildFlipCard(card, i, collection, rarityColors, onFlip));
        });

        updateProgress();
      };

      const runOpenSequence = async () => {
        await wait(900);
        openImg.classList.remove('enter');
        openImg.classList.add('shake');
        await wait(1100);
        openImg.classList.remove('shake');
        openImg.classList.add('burst-out');
        await wait(550);
        revealCards();
      };

      openCloseBtn.onclick = () => {
        hideOverlay();
        resolve();
      };

      runOpenSequence();
    });
  };

  return {
    getPackImageUrl,
    getCardBackUrl,
    showPurchaseSuccess,
    showPackOpenReveal,
  };
})();

window.PackAnimation = PackAnimation;
