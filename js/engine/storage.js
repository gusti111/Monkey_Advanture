  /**
 * storage.js — LocalStorage Manager
 * Handles: username persistence & Top-5 Leaderboard
 */

const Storage = (() => {
  const KEY_USER   = 'mbr_username';
  const KEY_SCORES = 'mbr_scores';
  const MAX_ENTRIES = 5;

  function getUsername() {
    return localStorage.getItem(KEY_USER) || null;
  }

  function setUsername(name) {
    const clean = name.trim().slice(0, 12) || 'Pemain';
    localStorage.setItem(KEY_USER, clean);
    return clean;
  }

  /** @returns {Array<{name,score,time,date}>} sorted descending */
  function getScores() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SCORES)) || [];
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
    localStorage.setItem(KEY_SCORES, JSON.stringify(trimmed));

    const prevBest = scores.length > 1 ? scores[1].score : 0;
    const isNewBest = score >= (scores[0].score);

    return { isNewBest: rank === 1, rank };
  }

  function getBestScore() {
    const scores = getScores();
    return scores.length ? scores[0].score : 0;
  }

  return { getUsername, setUsername, getScores, saveScore, getBestScore };
})();