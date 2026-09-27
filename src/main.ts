// ============================================================
// Точка входа: конфигурация Phaser, создание экземпляра игры.
// SDK Яндекса инициализируется внутри BootScene (до старта).
// ============================================================
import Phaser from 'phaser';
import { createGameConfig } from './config/GameConfig';

// Защита от «двойного» создания при HMR в dev-режиме Vite
const existing = (window as unknown as { __CHAKRA_GAME__?: Phaser.Game })
  .__CHAKRA_GAME__;
if (existing) {
  existing.destroy(true);
}

const config = createGameConfig();
const game = new Phaser.Game(config);
(window as unknown as { __CHAKRA_GAME__: Phaser.Game }).__CHAKRA_GAME__ = game;

// Предотвращаем pull-to-refresh / скролл на мобильных
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.cancelable) e.preventDefault();
  },
  { passive: false }
);
