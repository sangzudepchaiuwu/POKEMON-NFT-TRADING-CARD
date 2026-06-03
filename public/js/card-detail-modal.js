/**
 * Modal hiển thị chi tiết 1 thẻ (name, rarity, hp, types, attacks, weaknesses...)
 * Dữ liệu lấy từ /api/cards/:collection/:cardId/full
 */
const CardDetailModal = (() => {
  let modalEl = null;
  const detailCache = new Map();

  const hexToRgba = (hex, alpha) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return `rgba(255,255,255,${alpha})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  const ensureModal = () => {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'card-detail-modal';
    modalEl.id = 'cardDetailModal';
    modalEl.innerHTML = `<div class="card-detail-modal-inner" id="cardDetailModalInner"></div>`;
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
    });
    document.body.appendChild(modalEl);
    return modalEl;
  };

  const show = async (card, collection, rarityColors = {}) => {
    ensureModal();
    const inner = modalEl.querySelector('#cardDetailModalInner');
    const rarityColor = rarityColors?.[card.rarity] || '#FFD700';
    const rarityGlow = hexToRgba(rarityColor, 0.55);

    // Skeleton ban đầu
    inner.style.setProperty('--rarity-color', rarityColor);
    inner.style.setProperty('--rarity-glow', rarityGlow);
    inner.innerHTML = `
      <button type="button" class="card-detail-close" id="cardDetailCloseBtn">×</button>
      <img class="card-detail-img" src="${card.image || ''}" alt="${card.name || ''}">
      <div class="card-detail-body">
        <h3 class="card-detail-name">${card.name || card.id}</h3>
        <div class="card-detail-meta">
          <span class="card-chip rarity">${card.rarity || 'Unknown'}</span>
          <span class="card-chip">${card.id}</span>
        </div>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;">Đang tải chi tiết...</p>
      </div>`;
    inner.querySelector('#cardDetailCloseBtn').addEventListener('click', hide);

    modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      const cacheKey = `${collection}/${card.id}`;
      let full;
      if (detailCache.has(cacheKey)) {
        full = detailCache.get(cacheKey);
      } else {
        const res = await getCardFull(collection, card.id);
        full = res.card;
        detailCache.set(cacheKey, full);
      }
      render(inner, full, rarityColor, rarityGlow);
    } catch (err) {
      const body = inner.querySelector('.card-detail-body');
      if (body) {
        body.innerHTML += `<p style="color:#ff8a80;font-size:12px;">Không tải được chi tiết: ${err.message}</p>`;
      }
    }
  };

  const render = (inner, full, rarityColor, rarityGlow) => {
    const types = Array.isArray(full.types) ? full.types : [];
    const attacks = Array.isArray(full.attacks) ? full.attacks : [];
    const weaknesses = Array.isArray(full.weaknesses) ? full.weaknesses : [];
    const resistances = Array.isArray(full.resistances) ? full.resistances : [];

    const typeChip = (t) =>
      `<span class="card-chip type-${t}">${t}</span>`;

    const energyPill = (e) => `<span class="energy-pill type-${e}">${e}</span>`;

    const attacksHtml = attacks
      .map(
        (a) => `
        <div class="attack-item">
          <div class="attack-header">
            <div>
              <span class="attack-cost">${(a.cost || []).map(energyPill).join('')}</span>
              <span class="attack-name">${a.name || ''}</span>
            </div>
            ${a.damage ? `<span class="attack-damage">${a.damage}</span>` : ''}
          </div>
          ${a.effect ? `<div class="attack-effect">${a.effect}</div>` : ''}
        </div>`
      )
      .join('');

    const weakHtml = weaknesses
      .map((w) => `<span class="card-chip type-${w.type}">${w.type} ${w.value || ''}</span>`)
      .join('');

    const resistHtml = resistances
      .map((w) => `<span class="card-chip type-${w.type}">${w.type} ${w.value || ''}</span>`)
      .join('');

    const body = `
      <button type="button" class="card-detail-close" id="cardDetailCloseBtn">×</button>
      <img class="card-detail-img" src="${full.image || ''}" alt="${full.name || ''}">
      <div class="card-detail-body">
        <h3 class="card-detail-name">${full.name || full.id}</h3>
        <div class="card-detail-meta">
          <span class="card-chip rarity">${full.rarity || 'Unknown'}</span>
          ${full.hp ? `<span class="card-chip hp">HP ${full.hp}</span>` : ''}
          ${full.stage ? `<span class="card-chip">${full.stage}</span>` : ''}
          ${types.map(typeChip).join('')}
          <span class="card-chip">${full.id}</span>
        </div>

        ${
          full.illustrator
            ? `<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">
                Illustrator: ${full.illustrator}
              </div>`
            : ''
        }

        ${
          attacks.length
            ? `<div class="card-detail-section">
                <h4>Attacks</h4>
                ${attacksHtml}
              </div>`
            : ''
        }

        ${
          weaknesses.length
            ? `<div class="card-detail-section">
                <h4>Weaknesses</h4>
                <div class="weakness-grid">${weakHtml}</div>
              </div>`
            : ''
        }

        ${
          resistances.length
            ? `<div class="card-detail-section">
                <h4>Resistances</h4>
                <div class="weakness-grid">${resistHtml}</div>
              </div>`
            : ''
        }

        ${
          full.retreat != null
            ? `<div class="card-detail-section">
                <h4>Retreat Cost</h4>
                <div class="weakness-grid">${Array(full.retreat).fill(energyPill('Colorless')).join('')}</div>
              </div>`
            : ''
        }

        ${
          full.set?.name
            ? `<div class="card-detail-section">
                <h4>Set</h4>
                <div style="font-size:13px;">${full.set.name} (${full.set.id || ''})</div>
              </div>`
            : ''
        }
      </div>`;

    inner.style.setProperty('--rarity-color', rarityColor);
    inner.style.setProperty('--rarity-glow', rarityGlow);
    inner.innerHTML = body;
    inner.querySelector('#cardDetailCloseBtn').addEventListener('click', hide);
    if (window.renderLucideIcons) window.renderLucideIcons();
  };

  const hide = () => {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    document.body.style.overflow = '';
  };

  return { show, hide };
})();

window.CardDetailModal = CardDetailModal;
