/**
 * storage.js — LocalStorage Manager
 * Handles: username persistence & Top-5 Leaderboard
 */

const Storage = (() => {
  const KEY_USER   = 'mbr_username';
  const KEY_SCORES = 'mbr_scores';
  const KEY_COINS  = 'mbr_coins';
  const KEY_UPGRADES = 'mbr_upgrades';
  const MAX_ENTRIES = 5;

  const _fallbackStore = {};
  const _hasLocalStorage = (() => {
    try {
      const ls = typeof window !== 'undefined' && window.localStorage;
      if (!ls) return false;
      const testKey = '__mbr_storage_test__';
      ls.setItem(testKey, '1');
      ls.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function _getItem(key) {
    if (!_hasLocalStorage) return _fallbackStore[key] || null;
    return window.localStorage.getItem(key);
  }

  function _setItem(key, value) {
    if (!_hasLocalStorage) {
      _fallbackStore[key] = String(value);
      return;
    }
    window.localStorage.setItem(key, String(value));
  }

  function getCoins() {
    const v = parseInt(_getItem(KEY_COINS), 10);
    return Number.isFinite(v) ? v : 0;
  }

  function addCoins(amount) {
    const total = Math.max(0, getCoins() + Math.floor(amount || 0));
    _setItem(KEY_COINS, String(total));
    return total;
  }

  function getItem(key) {
    return _getItem(key);
  }

  function setItem(key, value) {
    _setItem(key, value);
  }

  /** @returns {boolean} true kalau saldo cukup & berhasil dipotong */
  function spendCoins(amount) {
    const cur = getCoins();
    if (cur < amount) return false;
    _setItem(KEY_COINS, String(cur - amount));
    return true;
  }

  /* ── Shop Upgrades (level per kategori, persisten) ── */
  const DEFAULT_UPGRADES = { ammo: 0, shield: 0, magnet: 0, coinBoost: 0, bananaHarvest: 0 };

  function getUpgrades() {
    try {
      const saved = JSON.parse(_getItem(KEY_UPGRADES));
      return { ...DEFAULT_UPGRADES, ...(saved || {}) };
    } catch {
      return { ...DEFAULT_UPGRADES };
    }
  }

  function setUpgradeLevel(key, level) {
    const upgrades = getUpgrades();
    upgrades[key] = level;
    _setItem(KEY_UPGRADES, JSON.stringify(upgrades));
    return upgrades;
  }

  function getUsername() {
    return _getItem(KEY_USER) || null;
  }

  function setUsername(name) {
    const clean = name.trim().slice(0, 12) || 'Pemain';
    _setItem(KEY_USER, clean);
    return clean;
  }

  /** @returns {Array<{name,score,time,date}>} sorted descending */
  function getScores() {
    try {
      return JSON.parse(_getItem(KEY_SCORES)) || [];
    } catch {
      return [];
    }
  }

  /**
   * Save a score entry. Returns { isNewBest, rank }
   */
  function saveScore({ name, score, time, multiplier }) {
    const scores = getScores();
    const entry  = {
      name: name.slice(0, 12),
      score,
      time,
      multiplier,
      date: new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'short' })
    };
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const rank = scores.findIndex(s => s === entry) + 1;
    const trimmed = scores.slice(0, MAX_ENTRIES);
    _setItem(KEY_SCORES, JSON.stringify(trimmed));

    return { isNewBest: rank === 1, rank };
  }

  function getBestScore() {
    const scores = getScores();
    return scores.length ? scores[0].score : 0;
  }

  return {
    getUsername, setUsername, getScores, saveScore, getBestScore,
    getCoins, addCoins, spendCoins,
    getUpgrades, setUpgradeLevel,
    getItem, setItem,
  };
})();