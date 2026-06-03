/**
 * Marketplace UI (browse / detail modal / mine / activity)
 */
const Marketplace = (() => {
  let activeSubtab = 'browse';
  let detailModalEl = null;

  const SHINY = new Set([
    'Rare', 'Holo Rare', 'Holo Rare V', 'Holo Rare VMAX',
    'Ultra Rare', 'Secret Rare',
  ]);

  const hexToRgba = (hex, alpha) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return `rgba(255,255,255,${alpha})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  };

  const rarityColor = (r) =>
    (typeof dropRateInfo !== 'undefined' && dropRateInfo.colors?.[r]) || '#FFFFFF';

  const shortAddr = (addr) =>
    addr ? `${addr.substring(0, 6)}…${addr.slice(-4)}` : '—';

  const formatPrice = (p) => `${Number(p).toFixed(4)} AVAX`;

  const formatTime = (ts) => new Date(ts).toLocaleString();

  /** Init: gắn event cho sub-tabs + filters */
  const init = () => {
    document.querySelectorAll('.market-subtab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.market-subtab').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.market-pane').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.subtab;
        activeSubtab = tab;
        document.getElementById(`market-${tab}`).classList.add('active');
        if (tab === 'browse') loadBrowse();
        if (tab === 'mine') loadMine();
        if (tab === 'activity') loadActivity();
      });
    });

    document.getElementById('marketSearch')?.addEventListener('input', debounce(loadBrowse, 300));
    document.getElementById('marketCollection')?.addEventListener('change', loadBrowse);
    document.getElementById('marketSort')?.addEventListener('change', loadBrowse);
    document.getElementById('marketRefreshBtn')?.addEventListener('click', loadBrowse);
    document.getElementById('activityMineOnly')?.addEventListener('change', loadActivity);
  };

  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  /**
   * Custom confirm modal — đẹp hơn confirm() native.
   * Returns Promise<boolean>.
   * opts: { title, message, confirmText, cancelText, variant: 'primary'|'danger'|'success', icon }
   */
  const confirmModal = (opts) =>
    new Promise((resolve) => {
      const {
        title = 'Xác nhận',
        message = '',
        confirmText = 'Đồng ý',
        cancelText = 'Hủy',
        variant = 'primary',
        icon = 'help-circle',
        details = null,
      } = opts || {};

      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay';
      overlay.innerHTML = `
        <div class="confirm-modal">
          <div class="confirm-modal-icon confirm-modal-icon-${variant}">
            <i data-lucide="${icon}"></i>
          </div>
          <h3 class="confirm-modal-title">${title}</h3>
          <p class="confirm-modal-message">${message}</p>
          ${details ? `<div class="confirm-modal-details">${details}</div>` : ''}
          <div class="confirm-modal-actions">
            <button class="confirm-modal-btn confirm-modal-btn-cancel" data-act="cancel">${cancelText}</button>
            <button class="confirm-modal-btn confirm-modal-btn-${variant}" data-act="ok">${confirmText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      if (window.renderLucideIcons) window.renderLucideIcons();
      requestAnimationFrame(() => overlay.classList.add('active'));

      const cleanup = (answer) => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
        resolve(answer);
      };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'ok') cleanup(true);
        if (act === 'cancel') cleanup(false);
      });
      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          cleanup(false);
          document.removeEventListener('keydown', keyHandler);
        }
        if (e.key === 'Enter') {
          cleanup(true);
          document.removeEventListener('keydown', keyHandler);
        }
      };
      document.addEventListener('keydown', keyHandler);
    });

  /* ---------- BROWSE ---------- */
  const loadBrowse = async () => {
    const grid = document.getElementById('marketplaceGrid');
    const loading = document.getElementById('marketplaceLoading');
    if (loading) loading.classList.add('active');
    try {
      const res = await getMarketplaceListings({
        search: document.getElementById('marketSearch')?.value || '',
        collection: document.getElementById('marketCollection')?.value || '',
        sort: document.getElementById('marketSort')?.value || 'recent',
      });
      renderListingsGrid(grid, res.listings || []);
    } catch (err) {
      grid.innerHTML = `<p class="market-empty">Lỗi: ${err.message}</p>`;
    } finally {
      if (loading) loading.classList.remove('active');
    }
  };

  const renderListingsGrid = (grid, listings) => {
    if (!listings.length) {
      grid.innerHTML = '<p class="market-empty">Chưa có listings nào. Hãy là người đầu tiên đăng bán!</p>';
      return;
    }
    grid.innerHTML = listings.map((l) => listingCardHtml(l)).join('');
    grid.querySelectorAll('[data-listing-id]').forEach((el) => {
      el.addEventListener('click', () => openDetail(Number(el.dataset.listingId)));
    });
    if (window.renderLucideIcons) window.renderLucideIcons();
  };

  const listingCardHtml = (l) => {
    const color = rarityColor(l.rarity);
    const glow = hexToRgba(color, 0.45);
    return `
      <div class="market-card" data-listing-id="${l.id}"
           style="--rarity-color:${color};--rarity-glow:${glow};">
        <img class="market-card-img" src="${l.card?.image || ''}" alt="${l.name || ''}"
          onerror="this.style.opacity=0.3">
        <div class="market-card-body">
          <div class="market-card-name" title="${l.name || ''}">${l.name || l.card_id}</div>
          <div class="market-card-rarity">${l.rarity || ''}</div>
          <div class="market-card-price">
            <span class="market-card-price-label">Price</span>
            <span class="market-card-price-value">${formatPrice(l.price)}</span>
          </div>
          <div class="market-card-seller">By ${shortAddr(l.seller_address)}</div>
        </div>
      </div>`;
  };

  /* ---------- MINE ---------- */
  const loadMine = async () => {
    if (!window.userAccount) {
      document.getElementById('myListingsGrid').innerHTML =
        '<p class="market-empty">Kết nối ví để xem.</p>';
      document.getElementById('offersToMeList').innerHTML = '';
      document.getElementById('offersByMeList').innerHTML = '';
      return;
    }
    try {
      const res = await getMyMarket(window.userAccount);
      renderMyListings(res.listings || []);
      renderOffersToMe(res.offersToMe || []);
      renderOffersByMe(res.offersByMe || []);
    } catch (err) {
      document.getElementById('myListingsGrid').innerHTML =
        `<p class="market-empty">Lỗi: ${err.message}</p>`;
    }
  };

  const renderMyListings = (listings) => {
    const grid = document.getElementById('myListingsGrid');
    if (!listings.length) {
      grid.innerHTML = '<p class="market-empty">Bạn chưa có listing nào.</p>';
      return;
    }
    grid.innerHTML = listings.map((l) => {
      const color = rarityColor(l.rarity);
      const glow = hexToRgba(color, 0.45);
      const statusBadge = `<span class="offer-status ${l.status}">${l.status}</span>`;
      return `
        <div class="market-card" data-listing-id="${l.id}"
             style="--rarity-color:${color};--rarity-glow:${glow};">
          <img class="market-card-img" src="${l.card?.image || ''}" alt="${l.name || ''}"
            onerror="this.style.opacity=0.3">
          <div class="market-card-body">
            <div class="market-card-name">${l.name || l.card_id}</div>
            <div class="market-card-rarity">${l.rarity || ''} ${statusBadge}</div>
            <div class="market-card-price">
              <span class="market-card-price-label">Price</span>
              <span class="market-card-price-value">${formatPrice(l.price)}</span>
            </div>
            ${l.buyer_address ? `<div class="market-card-seller">Buyer: ${shortAddr(l.buyer_address)}</div>` : ''}
          </div>
        </div>`;
    }).join('');
    grid.querySelectorAll('[data-listing-id]').forEach((el) => {
      el.addEventListener('click', () => openDetail(Number(el.dataset.listingId)));
    });
  };

  const renderOffersToMe = (offers) => {
    const el = document.getElementById('offersToMeList');
    if (!offers.length) {
      el.innerHTML = '<p class="market-empty">Chưa có offer nào chờ duyệt.</p>';
      return;
    }
    el.innerHTML = offers.map((o) => `
      <div class="offer-row">
        <div class="offer-info">
          <strong>${o.card_id}</strong> · ${o.collection}<br>
          Từ <span style="font-family:monospace">${shortAddr(o.offerer_address)}</span> · ${formatTime(o.created_at)}
        </div>
        <div class="offer-price">${formatPrice(o.offer_price)}</div>
        <div class="offer-actions">
          <button class="btn btn-primary" data-accept="${o.id}"><i data-lucide="check"></i></button>
        </div>
      </div>`).join('');
    el.querySelectorAll('[data-accept]').forEach((btn) => {
      btn.addEventListener('click', () => handleAcceptOffer(Number(btn.dataset.accept)));
    });
    if (window.renderLucideIcons) window.renderLucideIcons();
  };

  const renderOffersByMe = (offers) => {
    const el = document.getElementById('offersByMeList');
    if (!offers.length) {
      el.innerHTML = '<p class="market-empty">Bạn chưa gửi offer nào.</p>';
      return;
    }
    el.innerHTML = offers.map((o) => `
      <div class="offer-row">
        <div class="offer-info">
          <strong>${o.card_id}</strong> · ${o.collection}<br>
          Listing #${o.listing_id} · ${formatTime(o.created_at)}
          <span class="offer-status ${o.status}">${o.status}</span>
        </div>
        <div class="offer-price">${formatPrice(o.offer_price)}</div>
        <div class="offer-actions">
          ${o.status === 'pending'
            ? `<button class="btn btn-secondary" data-cancel-offer="${o.id}"><i data-lucide="x"></i></button>`
            : ''}
        </div>
      </div>`).join('');
    el.querySelectorAll('[data-cancel-offer]').forEach((btn) => {
      btn.addEventListener('click', () => handleCancelOffer(Number(btn.dataset.cancelOffer)));
    });
    if (window.renderLucideIcons) window.renderLucideIcons();
  };

  /* ---------- ACTIVITY ---------- */
  const loadActivity = async () => {
    const el = document.getElementById('marketActivityList');
    const mineOnly = document.getElementById('activityMineOnly')?.checked;
    try {
      const res = await getMarketActivity(mineOnly && window.userAccount ? window.userAccount : null);
      renderActivity(el, res.activity || []);
    } catch (err) {
      el.innerHTML = `<p class="market-empty">Lỗi: ${err.message}</p>`;
    }
  };

  const ACTIVITY_LABELS = {
    listed: { icon: 'tag', text: (a) => `<strong>${shortAddr(a.actor_address)}</strong> đã đăng bán <strong>${a.card_id}</strong>` },
    sold: { icon: 'check-circle', text: (a) => `<strong>${shortAddr(a.actor_address)}</strong> đã mua <strong>${a.card_id}</strong> từ ${shortAddr(a.counter_party)}` },
    offer_made: { icon: 'hand-coins', text: (a) => `<strong>${shortAddr(a.actor_address)}</strong> gửi offer cho <strong>${a.card_id}</strong>` },
    offer_accepted: { icon: 'check', text: (a) => `<strong>${shortAddr(a.actor_address)}</strong> chấp nhận offer của ${shortAddr(a.counter_party)}` },
    offer_cancelled: { icon: 'x', text: (a) => `<strong>${shortAddr(a.actor_address)}</strong> hủy offer` },
    cancelled: { icon: 'x-circle', text: (a) => `<strong>${shortAddr(a.actor_address)}</strong> hủy listing <strong>${a.card_id}</strong>` },
  };

  const renderActivity = (el, items) => {
    if (!items.length) {
      el.innerHTML = '<p class="market-empty">Chưa có hoạt động nào.</p>';
      return;
    }
    el.innerHTML = items.map((a) => {
      const def = ACTIVITY_LABELS[a.event_type] || { icon: 'circle', text: () => a.event_type };
      return `
        <div class="activity-row">
          <span class="activity-icon ${a.event_type}"><i data-lucide="${def.icon}"></i></span>
          <div class="activity-text">${def.text(a)}</div>
          <div class="activity-meta">
            ${a.price != null ? `<div class="price">${formatPrice(a.price)}</div>` : ''}
            <div>${formatTime(a.created_at)}</div>
          </div>
        </div>`;
    }).join('');
    if (window.renderLucideIcons) window.renderLucideIcons();
  };

  /* ---------- DETAIL MODAL ---------- */
  const ensureDetailModal = () => {
    if (detailModalEl) return detailModalEl;
    detailModalEl = document.createElement('div');
    detailModalEl.className = 'card-detail-modal';
    detailModalEl.id = 'listingDetailModal';
    detailModalEl.innerHTML = `<div class="card-detail-modal-inner" id="listingDetailInner"></div>`;
    detailModalEl.addEventListener('click', (e) => {
      if (e.target === detailModalEl) closeDetail();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });
    document.body.appendChild(detailModalEl);
    return detailModalEl;
  };

  const openDetail = async (listingId) => {
    ensureDetailModal();
    const inner = detailModalEl.querySelector('#listingDetailInner');
    inner.innerHTML = `
      <button type="button" class="card-detail-close" onclick="Marketplace.closeDetail()">×</button>
      <div style="padding:40px;text-align:center;color:var(--text-secondary);">Đang tải listing…</div>`;
    detailModalEl.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      const { listing } = await getListingDetail(listingId);
      renderDetail(inner, listing);
    } catch (err) {
      inner.innerHTML = `
        <button type="button" class="card-detail-close" onclick="Marketplace.closeDetail()">×</button>
        <div style="padding:40px;text-align:center;color:#ff8a80;">Lỗi: ${err.message}</div>`;
    }
  };

  const closeDetail = () => {
    if (!detailModalEl) return;
    detailModalEl.classList.remove('active');
    document.body.style.overflow = '';
  };

  const renderDetail = (inner, l) => {
    const color = rarityColor(l.rarity);
    const glow = hexToRgba(color, 0.55);
    const me = (window.userAccount || '').toLowerCase();
    const isSeller = me === (l.seller_address || '').toLowerCase();
    const isActive = l.status === 'active';

    const actions = [];
    if (isActive && !isSeller && me) {
      actions.push(`<button class="pack-action-btn" id="lmBuy"><i data-lucide="shopping-cart"></i> Mua ngay (${formatPrice(l.price)})</button>`);
    }
    if (isActive && isSeller) {
      actions.push(`<button class="btn btn-secondary" id="lmCancel"><i data-lucide="x"></i> Hủy listing</button>`);
    }

    const offerForm = isActive && !isSeller && me
      ? `<div class="card-detail-section">
          <h4>Đặt offer</h4>
          <div class="offer-form">
            <input type="number" step="0.0001" min="0" id="lmOfferPrice" placeholder="Giá đề nghị (AVAX)">
            <button class="btn btn-primary" id="lmMakeOffer"><i data-lucide="hand-coins"></i> Gửi offer</button>
          </div>
        </div>`
      : '';

    const offersHtml = l.offers && l.offers.length
      ? l.offers.map((o) => `
          <div class="offer-row">
            <div class="offer-info">
              <strong>${shortAddr(o.offerer_address)}</strong>
              <span class="offer-status ${o.status}">${o.status}</span>
              <br><small>${formatTime(o.created_at)}</small>
            </div>
            <div class="offer-price">${formatPrice(o.offer_price)}</div>
            <div class="offer-actions">
              ${isSeller && o.status === 'pending'
                ? `<button class="btn btn-primary" data-accept-offer="${o.id}"><i data-lucide="check"></i></button>`
                : ''}
              ${o.offerer_address === me && o.status === 'pending'
                ? `<button class="btn btn-secondary" data-cancel-my-offer="${o.id}"><i data-lucide="x"></i></button>`
                : ''}
            </div>
          </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:12px;">Chưa có offer nào.</p>';

    const activityHtml = l.activity && l.activity.length
      ? l.activity.map((a) => {
          const def = ACTIVITY_LABELS[a.event_type] || { icon: 'circle', text: () => a.event_type };
          return `
            <div class="activity-row">
              <span class="activity-icon ${a.event_type}"><i data-lucide="${def.icon}"></i></span>
              <div class="activity-text">${def.text(a)}</div>
              <div class="activity-meta">
                ${a.price != null ? `<div class="price">${formatPrice(a.price)}</div>` : ''}
                <div>${formatTime(a.created_at)}</div>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--text-muted);font-size:12px;">Chưa có hoạt động.</p>';

    inner.style.setProperty('--rarity-color', color);
    inner.style.setProperty('--rarity-glow', glow);
    inner.innerHTML = `
      <button type="button" class="card-detail-close" onclick="Marketplace.closeDetail()">×</button>
      <img class="card-detail-img" src="${l.card?.image || ''}" alt="${l.name || ''}">
      <div class="card-detail-body">
        <h3 class="card-detail-name">${l.name || l.card_id}</h3>
        <div class="card-detail-meta">
          <span class="card-chip rarity">${l.rarity || 'Unknown'}</span>
          <span class="card-chip">${l.collection}</span>
          <span class="card-chip">${l.card_id}</span>
          <span class="offer-status ${l.status}">${l.status}</span>
        </div>

        <div class="listing-price-big">${formatPrice(l.price)} <small>(seller ${shortAddr(l.seller_address)})</small></div>

        <div class="listing-modal-actions">${actions.join('')}</div>

        ${offerForm}

        <div class="card-detail-section">
          <h4>Offers (${l.offers?.length || 0})</h4>
          ${offersHtml}
        </div>

        <div class="card-detail-section">
          <h4>Lịch sử</h4>
          <div class="activity-list">${activityHtml}</div>
        </div>
      </div>`;

    inner.querySelector('#lmBuy')?.addEventListener('click', () => handleBuy(l.id));
    inner.querySelector('#lmCancel')?.addEventListener('click', () => handleCancel(l.id));
    inner.querySelector('#lmMakeOffer')?.addEventListener('click', () => handleMakeOffer(l.id));
    inner.querySelectorAll('[data-accept-offer]').forEach((b) =>
      b.addEventListener('click', () => handleAcceptOffer(Number(b.dataset.acceptOffer), l.id))
    );
    inner.querySelectorAll('[data-cancel-my-offer]').forEach((b) =>
      b.addEventListener('click', () => handleCancelOffer(Number(b.dataset.cancelMyOffer), l.id))
    );

    if (window.renderLucideIcons) window.renderLucideIcons();
  };

  /* ---------- ACTIONS ---------- */
  const handleBuy = async (listingId) => {
    if (!window.userAccount) return showAlert('Kết nối ví trước', 'error');
    try {
      // Lấy listing để có onChainListingId + price
      const { listing } = await getListingDetail(listingId);
      if (!listing) throw new Error('Listing không tồn tại');
      if (listing.on_chain_listing_id == null) {
        throw new Error('Listing này chưa được sync on-chain');
      }
      const ok = await confirmModal({
        title: 'Xác nhận mua thẻ',
        message: `Bạn sẽ mua <b>${listing.name}</b> và ký 1 giao dịch trên ví MetaMask.`,
        confirmText: `Mua ngay (${listing.price} AVAX)`,
        cancelText: 'Hủy',
        variant: 'success',
        icon: 'shopping-cart',
        details: `
          <div class="confirm-row"><span>Giá thẻ</span><b>${listing.price} AVAX</b></div>
          <div class="confirm-row"><span>Phí marketplace (2%)</span><span>${(listing.price * 0.02).toFixed(4)} AVAX</span></div>
          <div class="confirm-row confirm-row-total"><span>Tổng phải trả</span><b>${listing.price} AVAX + gas</b></div>
        `,
      });
      if (!ok) return;

      showAlert('Đang ký giao dịch mua...', 'info');
      const { txHash } = await window.buyOnChain({
        onChainListingId: listing.on_chain_listing_id,
        priceAvax: listing.price,
      });

      await buyListing(listingId, window.userAccount, txHash);
      showAlert(`Mua thành công! Tx: ${txHash.substring(0, 10)}…`, 'success');
      closeDetail();
      loadBrowse();
      if (typeof loadInventory === 'function') loadInventory();
    } catch (err) {
      console.error(err);
      showAlert('Lỗi: ' + (err.message || err.toString()), 'error');
    }
  };

  const handleCancel = async (listingId) => {
    const ok = await confirmModal({
      title: 'Hủy listing?',
      message: 'NFT sẽ được rút khỏi marketplace và trả về ví của bạn. Bạn cần ký 1 giao dịch trên MetaMask.',
      confirmText: 'Hủy listing',
      cancelText: 'Quay lại',
      variant: 'danger',
      icon: 'trash-2',
    });
    if (!ok) return;
    try {
      const { listing } = await getListingDetail(listingId);
      let txHash = null;
      if (listing?.on_chain_listing_id != null) {
        showAlert('Đang ký giao dịch hủy...', 'info');
        const res = await window.cancelListingOnChain(listing.on_chain_listing_id);
        txHash = res.txHash;
      }
      await cancelListing(listingId, window.userAccount, txHash);
      showAlert(`Đã hủy listing${txHash ? ` (tx: ${txHash.substring(0, 10)}…)` : ''}`, 'success');
      closeDetail();
      loadBrowse();
      loadMine();
    } catch (err) {
      console.error(err);
      showAlert('Lỗi: ' + (err.message || err.toString()), 'error');
    }
  };

  const handleMakeOffer = async (listingId) => {
    const input = document.getElementById('lmOfferPrice');
    const price = parseFloat(input?.value);
    if (!price || price <= 0) return showAlert('Nhập giá hợp lệ', 'error');
    try {
      const { listing } = await getListingDetail(listingId);
      if (!listing) throw new Error('Listing không tồn tại');
      if (listing.on_chain_listing_id == null) throw new Error('Listing không có on-chain id');
      const ok = await confirmModal({
        title: 'Xác nhận đặt offer',
        message: `Bạn sẽ đặt offer cho thẻ <b>${listing.name}</b>. AVAX sẽ bị <b>khóa trong smart contract</b> đến khi seller accept hoặc bạn hủy offer.`,
        confirmText: `Đặt offer ${price} AVAX`,
        cancelText: 'Quay lại',
        variant: 'primary',
        icon: 'gavel',
        details: `
          <div class="confirm-row"><span>Giá list hiện tại</span><span>${listing.price} AVAX</span></div>
          <div class="confirm-row"><span>Offer của bạn</span><b>${price} AVAX</b></div>
          <div class="confirm-row confirm-row-total"><span>AVAX sẽ bị khóa</span><b>${price} AVAX</b></div>
        `,
      });
      if (!ok) return;

      showAlert('Đang ký giao dịch offer...', 'info');
      const { txHash, onChainOfferId } = await window.makeOfferOnChain({
        onChainListingId: listing.on_chain_listing_id,
        priceAvax: price,
      });

      await makeOffer(listingId, window.userAccount, price, '', onChainOfferId, txHash);
      showAlert(`Đã gửi offer! Tx: ${txHash.substring(0, 10)}…`, 'success');
      openDetail(listingId);
    } catch (err) {
      console.error(err);
      showAlert('Lỗi: ' + (err.message || err.toString()), 'error');
    }
  };

  const handleAcceptOffer = async (offerId, listingId) => {
    const ok = await confirmModal({
      title: 'Chấp nhận offer?',
      message: 'NFT sẽ được chuyển cho buyer, và AVAX (trừ phí 2%) sẽ vào ví bạn ngay sau khi giao dịch confirm.',
      confirmText: 'Chấp nhận',
      cancelText: 'Quay lại',
      variant: 'success',
      icon: 'check-circle-2',
    });
    if (!ok) return;
    try {
      // Lấy on_chain_offer_id từ listing detail
      const lid = listingId || (await getOfferListingId(offerId));
      const { listing } = await getListingDetail(lid);
      const offer = listing.offers?.find((o) => o.id === offerId);
      if (!offer) throw new Error('Offer không tồn tại trong listing');
      if (offer.on_chain_offer_id == null) throw new Error('Offer không có on-chain id');

      showAlert('Đang ký giao dịch accept...', 'info');
      const { txHash } = await window.acceptOfferOnChain(offer.on_chain_offer_id);

      await acceptOffer(offerId, window.userAccount, txHash);
      showAlert(`Đã chấp nhận offer! Tx: ${txHash.substring(0, 10)}…`, 'success');
      if (listingId) openDetail(listingId);
      else loadMine();
    } catch (err) {
      console.error(err);
      showAlert('Lỗi: ' + (err.message || err.toString()), 'error');
    }
  };

  const handleCancelOffer = async (offerId, listingId) => {
    const ok = await confirmModal({
      title: 'Hủy offer?',
      message: 'AVAX bị khóa trong contract sẽ được refund về ví của bạn. Bạn cần ký 1 giao dịch trên MetaMask.',
      confirmText: 'Hủy offer + Rút AVAX',
      cancelText: 'Quay lại',
      variant: 'danger',
      icon: 'undo-2',
    });
    if (!ok) return;
    try {
      const lid = listingId || (await getOfferListingId(offerId));
      const { listing } = await getListingDetail(lid);
      const offer = listing.offers?.find((o) => o.id === offerId);
      if (!offer) throw new Error('Offer không tồn tại');

      let txHash = null;
      if (offer.on_chain_offer_id != null) {
        showAlert('Đang ký giao dịch hủy + refund...', 'info');
        const res = await window.cancelOfferOnChain(offer.on_chain_offer_id);
        txHash = res.txHash;
      }
      await cancelOffer(offerId, window.userAccount, txHash);
      showAlert(`Đã hủy offer${txHash ? ` (tx: ${txHash.substring(0, 10)}…)` : ''}`, 'success');
      if (listingId) openDetail(listingId);
      else loadMine();
    } catch (err) {
      console.error(err);
      showAlert('Lỗi: ' + (err.message || err.toString()), 'error');
    }
  };

  /** Helper: tìm listing_id từ offer_id (gọi /my để lookup) */
  const getOfferListingId = async (offerId) => {
    const res = await getMyMarket(window.userAccount);
    const inByMe = res.offersByMe?.find((o) => o.id === offerId);
    if (inByMe) return inByMe.listing_id;
    const inToMe = res.offersToMe?.find((o) => o.id === offerId);
    if (inToMe) return inToMe.listing_id;
    throw new Error('Không tìm thấy listing của offer này');
  };

  /* ---------- LIST FOR SALE MODAL (đẹp + on-chain) ---------- */
  let listFormModal = null;

  const ensureListFormModal = () => {
    if (listFormModal) return listFormModal;
    listFormModal = document.createElement('div');
    listFormModal.className = 'card-detail-modal';
    listFormModal.id = 'listFormModal';
    listFormModal.innerHTML = `<div class="card-detail-modal-inner list-form-inner" id="listFormInner"></div>`;
    listFormModal.addEventListener('click', (e) => {
      if (e.target === listFormModal) closeListForm();
    });
    document.body.appendChild(listFormModal);
    return listFormModal;
  };

  const closeListForm = () => {
    if (!listFormModal) return;
    listFormModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  const promptListForSale = async (card) => {
    if (!window.userAccount) return showAlert('Kết nối ví trước', 'error');
    if (card.nftTokenId == null) {
      return showAlert(
        'NFT chưa được mint xong. Vui lòng chờ vài giây rồi thử lại (xem trạng thái pack).',
        'error'
      );
    }
    ensureListFormModal();
    const color = rarityColor(card.rarity);
    const glow = hexToRgba(color, 0.55);
    const inner = listFormModal.querySelector('#listFormInner');
    inner.style.setProperty('--rarity-color', color);
    inner.style.setProperty('--rarity-glow', glow);

    inner.innerHTML = `
      <button type="button" class="card-detail-close" onclick="Marketplace.closeListForm()">×</button>
      <img class="card-detail-img" src="${card.image || ''}" alt="${card.name || ''}">
      <div class="card-detail-body">
        <h3 class="card-detail-name"><i data-lucide="tag"></i> Đăng bán</h3>
        <div class="card-detail-meta">
          <span class="card-chip rarity">${card.rarity || ''}</span>
          <span class="card-chip">${card.collection}</span>
          <span class="card-chip">${card.id}</span>
          <span class="card-chip">NFT #${card.nftTokenId}</span>
        </div>

        <div class="card-detail-section">
          <h4>Giá bán (AVAX)</h4>
          <div class="list-form-price">
            <input type="number" id="listPriceInput" step="0.0001" min="0.0001" placeholder="0.1" value="0.1" autofocus>
            <div class="list-form-quick">
              <button data-q="0.05">0.05</button>
              <button data-q="0.1">0.1</button>
              <button data-q="0.5">0.5</button>
              <button data-q="1">1</button>
              <button data-q="5">5</button>
            </div>
          </div>
        </div>

        <div class="card-detail-section">
          <h4>Tóm tắt</h4>
          <div class="list-form-summary">
            <div class="row"><span>Giá niêm yết</span><strong id="lpListPrice">0.1000 AVAX</strong></div>
            <div class="row muted"><span>Phí marketplace (2%)</span><strong id="lpFee">0.0020 AVAX</strong></div>
            <div class="row total"><span>Bạn nhận được</span><strong id="lpReceive">0.0980 AVAX</strong></div>
          </div>
        </div>

        <div class="list-form-steps">
          <div class="step" id="step1"><span class="step-num">1</span> Approve NFT cho Marketplace</div>
          <div class="step" id="step2"><span class="step-num">2</span> Đăng listing on-chain</div>
          <div class="step" id="step3"><span class="step-num">3</span> Lưu vào marketplace</div>
        </div>

        <div class="listing-modal-actions">
          <button class="btn btn-secondary" onclick="Marketplace.closeListForm()">Hủy</button>
          <button class="pack-action-btn" id="listConfirmBtn">
            <i data-lucide="rocket"></i> Xác nhận & ký giao dịch
          </button>
        </div>

        <p class="list-form-note">
          <i data-lucide="info"></i>
          Bạn sẽ phải ký 1-2 giao dịch trên ví. Mỗi giao dịch tạo 1 block trên Avalanche Fuji.
        </p>
      </div>`;

    const priceInput = inner.querySelector('#listPriceInput');
    const update = () => {
      const p = parseFloat(priceInput.value) || 0;
      const fee = p * 0.02;
      inner.querySelector('#lpListPrice').textContent = `${p.toFixed(4)} AVAX`;
      inner.querySelector('#lpFee').textContent = `${fee.toFixed(4)} AVAX`;
      inner.querySelector('#lpReceive').textContent = `${(p - fee).toFixed(4)} AVAX`;
    };
    priceInput.addEventListener('input', update);
    inner.querySelectorAll('.list-form-quick button').forEach((b) =>
      b.addEventListener('click', () => {
        priceInput.value = b.dataset.q;
        update();
      })
    );
    update();

    inner.querySelector('#listConfirmBtn').addEventListener('click', () => doListOnChain(card));

    listFormModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.renderLucideIcons) window.renderLucideIcons();
  };

  const markStep = (n, state) => {
    const el = document.getElementById(`step${n}`);
    if (!el) return;
    el.classList.remove('active', 'done', 'error');
    if (state) el.classList.add(state);
  };

  const doListOnChain = async (card) => {
    const inner = listFormModal.querySelector('#listFormInner');
    const btn = inner.querySelector('#listConfirmBtn');
    const priceInput = inner.querySelector('#listPriceInput');
    const price = parseFloat(priceInput.value);
    if (!price || price <= 0) return showAlert('Giá không hợp lệ', 'error');

    btn.disabled = true;
    try {
      // Step 1: approve
      markStep(1, 'active');
      // Step 2: list on contract — combined inside listOnChain (approve nếu cần)
      btn.innerHTML = '<i data-lucide="loader-circle"></i> Đang ký giao dịch...';
      if (window.renderLucideIcons) window.renderLucideIcons();

      const { txHash, onChainListingId } = await window.listOnChain({
        tokenId: card.nftTokenId,
        priceAvax: price,
      });
      markStep(1, 'done');
      markStep(2, 'done');

      // Step 3: save to backend
      markStep(3, 'active');
      await listCardForSale({
        packId: card.packId,
        cardIndex: card.cardIndex,
        sellerAddress: window.userAccount,
        price,
        nftTokenId: card.nftTokenId,
        onChainListingId,
        listTxHash: txHash,
      });
      markStep(3, 'done');

      showAlert(`Đã đăng bán ${card.name} với giá ${price} AVAX (tx: ${txHash.substring(0, 10)}…)`, 'success');
      closeListForm();
      if (typeof loadInventory === 'function') loadInventory();
      loadBrowse();
    } catch (err) {
      console.error(err);
      markStep(1, 'error');
      showAlert('Lỗi: ' + (err.message || err.toString()), 'error');
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="rocket"></i> Thử lại';
      if (window.renderLucideIcons) window.renderLucideIcons();
    }
  };

  return {
    init,
    loadBrowse,
    loadMine,
    loadActivity,
    openDetail,
    closeDetail,
    promptListForSale,
  };
})();

window.Marketplace = Marketplace;
document.addEventListener('DOMContentLoaded', () => Marketplace.init());
