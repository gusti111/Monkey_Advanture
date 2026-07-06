/**
 * shopManager.js — In-Game Shop Logic
 *
 * Handles all logic for the upgrade shop, including:
 * - Defining upgrade costs, levels, and descriptions.
 * - Rendering the shop item cards into the DOM.
 * - Handling the purchase logic when a user buys an upgrade.
 */

const ShopManager = (() => {
  // Central configuration for all purchasable upgrades.
  const UPGRADE_CONFIG = {
    ammo: {
      label: 'Kapasitas Pisang', icon: '🍌', maxLevel: 5,
      costs: [50, 100, 150, 200, 250],
      desc: (lvl) => `Stok awal +${lvl}, kapasitas maksimal +${lvl * 5}`,
    },
    shield: {
      label: 'Perisai Bekantan', icon: '🛡️', maxLevel: 3,
      costs: [150, 300, 500],
      desc: (lvl) => `${lvl} nyawa cadangan setiap main (nyerap 1 tabrakan mematikan)`,
    },
    magnet: {
      label: 'Magnet Rejeki', icon: '🧲', maxLevel: 3,
      costs: [100, 250, 450],
      desc: (lvl) => `Radius sedot otomatis koin/pisang/peti: ${90 + lvl * 40}px`,
    },
    coinBoost: {
      label: 'Bonus Koin', icon: '💰', maxLevel: 3,
      costs: [120, 260, 480],
      desc: (lvl) => `Dapatkan +${lvl} koin ekstra tiap koleksi`,
    },
    bananaHarvest: {
      label: 'Pemanen Pisang', icon: '🌾', maxLevel: 3,
      costs: [130, 280, 520],
      desc: (lvl) => `Isi ulang pisang +${lvl} saat ambil banana`,
    },
  };

  /**
   * Renders the entire shop interface based on current player data.
   */
  function render() {
    const coins = Storage.getCoins();
    const balEl = document.getElementById('shop-coin-balance');
    if (balEl) balEl.textContent = coins.toLocaleString('id-ID');

    const list = document.getElementById('shop-list');
    if (!list) return;
    const currentUpgrades = Storage.getUpgrades();
    list.innerHTML = '';

    Object.entries(UPGRADE_CONFIG).forEach(([key, cfg]) => {
      const level = currentUpgrades[key] || 0;
      const isMax = level >= cfg.maxLevel;
      const cost = isMax ? null : cfg.costs[level];
      const canAfford = !isMax && coins >= cost;

      const card = document.createElement('div');
      card.className = 'shop-item glass-card-mini';
      card.innerHTML = `
        <div class="shop-item-icon">${cfg.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-title">${cfg.label} <span class="shop-item-level">Lv.${level}/${cfg.maxLevel}</span></div>
          <div class="shop-item-desc">${level > 0 ? cfg.desc(level) : 'Belum dibeli'}</div>
          ${!isMax ? `<div class="shop-item-next">Level berikut: ${cfg.desc(level + 1)}</div>` : ''}
        </div>
        <button class="shop-buy-btn" ${isMax ? 'disabled' : ''} data-key="${key}">
          ${isMax ? 'MAX' : `🪙 ${cost}`}
        </button>
      `;
      if (!isMax) {
        const btn = card.querySelector('.shop-buy-btn');
        if (!canAfford) btn.disabled = true;
        btn.addEventListener('click', () => buyUpgrade(key));
      }
      list.appendChild(card);
    });
  }

  /**
   * Handles the logic for purchasing a single upgrade.
   * @param {string} key The key of the upgrade to buy (e.g., 'ammo').
   */
  function buyUpgrade(key) {
    const cfg = UPGRADE_CONFIG[key];
    const currentUpgrades = Storage.getUpgrades();
    const level = currentUpgrades[key] || 0;
    if (level >= cfg.maxLevel) return;
    const cost = cfg.costs[level];
    if (!Storage.spendCoins(cost)) {
      // UIManager.showToast('🪙 Koin tidak cukup!', 1400); // Future improvement: move toast to UIManager
      return;
    }
    Storage.setUpgradeLevel(key, level + 1);
    AudioController.playChestCoin();
    render(); // Re-render the shop to reflect the new state
  }

  // Public API
  return { render };
})();