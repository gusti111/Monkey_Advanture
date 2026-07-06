/**
 * Unit tests for storage.js
 *
 * These tests verify the logic for saving and retrieving game data
 * like scores, coins, and upgrades. It uses a mock for the global
 * localStorage to isolate the tests.
 */

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    clear() {
      store = {};
    },
    removeItem(key) {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Assuming Storage is available globally or can be required
// const Storage = require('./storage.js');

describe('Storage Manager', () => {

  beforeEach(() => {
    // Clear the mock storage before each test
    window.localStorage.clear();
  });

  describe('Username', () => {
    it('should return null for a new user', () => {
      expect(Storage.getUsername()).toBeNull();
    });

    it('should set and get a username', () => {
      Storage.setUsername('Banu');
      expect(Storage.getUsername()).toBe('Banu');
    });

    it('should trim and limit username length', () => {
      const longName = '  ThisIsAVeryLongUsername  ';
      const expected = 'ThisIsAVeryL'; // a-zA-Z0-9_
      Storage.setUsername(longName);
      expect(Storage.getUsername()).toBe(expected);
    });
  });

  describe('Coins', () => {
    it('should start with 0 coins', () => {
      expect(Storage.getCoins()).toBe(0);
    });

    it('should add coins correctly', () => {
      Storage.addCoins(100);
      expect(Storage.getCoins()).toBe(100);
      Storage.addCoins(50);
      expect(Storage.getCoins()).toBe(150);
    });

    it('should spend coins if balance is sufficient', () => {
      Storage.addCoins(200);
      const success = Storage.spendCoins(120);
      expect(success).toBe(true);
      expect(Storage.getCoins()).toBe(80);
    });

    it('should not spend coins if balance is insufficient', () => {
      Storage.addCoins(50);
      const success = Storage.spendCoins(100);
      expect(success).toBe(false);
      expect(Storage.getCoins()).toBe(50);
    });
  });

  describe('Scores', () => {
    it('should return an empty array for scores initially', () => {
      expect(Storage.getScores()).toEqual([]);
      expect(Storage.getBestScore()).toBe(0);
    });

    it('should save a score and report it as a new best', () => {
      const result = Storage.saveScore({ name: 'Banu', score: 5000 });
      expect(result.isNewBest).toBe(true);
      expect(Storage.getBestScore()).toBe(5000);
      expect(Storage.getScores().length).toBe(1);
    });

    it('should sort scores in descending order', () => {
      Storage.saveScore({ name: 'Banu', score: 5000 });
      Storage.saveScore({ name: 'Banu', score: 8000 });
      Storage.saveScore({ name: 'Banu', score: 3000 });

      const scores = Storage.getScores();
      expect(scores[0].score).toBe(8000);
      expect(scores[1].score).toBe(5000);
      expect(scores[2].score).toBe(3000);
      expect(Storage.getBestScore()).toBe(8000);
    });

    it('should only keep the top 5 scores', () => {
      for (let i = 1; i <= 7; i++) {
        Storage.saveScore({ name: 'Player', score: i * 1000 });
      }
      const scores = Storage.getScores();
      expect(scores.length).toBe(5);
      expect(scores[0].score).toBe(7000);
      expect(scores[4].score).toBe(3000);
    });
  });

  // You can add similar tests for `getUpgrades` and `setUpgradeLevel`

});