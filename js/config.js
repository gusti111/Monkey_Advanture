/**
 * config.js — Global Game Configuration
 *
 * A central place for game-wide constants like internal resolution,
 * physics parameters, and scoring settings. This makes it easy to
 * tune the game's feel without digging through multiple files.
 */

const Config = {
  // Canvas & Resolution
  W_INT: 1920,
  H_INT: 1080,
  GROUND_RATIO: 0.78,

  // Game Speed & Score
  SPEED_INIT: 400,
  SPEED_SCALE: 110,
  SCORE_TIME_M: 0.035,

  // Set true saat development untuk menampilkan debug overlay (pool sizes, dll).
  // WAJIB false saat build/deploy ke pemain — jangan bocorkan info internal ini.
  DEBUG: false,

  // Other constants can be moved here as well
};