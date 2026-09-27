// ============================================================
// Конфигурация Phaser: масштабирование под любой экран,
// физика Arcade, список сцен.
// ============================================================
import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#05060d',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        // Отключаем debug — на мобильных и так всё видно
        debug: false,
      },
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    fps: {
      target: 60,
      min: 10,
      forceSetTimeOut: false,
    },
    disableContextMenu: true,
    scene: [BootScene, MainMenuScene, GameScene, UIScene],
  };
}

/** Глобальные игровые константы (баланс). */
export const GAME_BALANCE = {
  PLAYER_BASE_SPEED: 230,
  PLAYER_BASE_HP: 100,
  PLAYER_RADIUS: 14,
  PLAYER_PICKUP_BASE: 90,
  KUNAI_BASE_COOLDOWN: 1.1,
  ENEMY_BASE_HP: 10,
  ENEMY_BASE_SPEED: 70,
  ENEMY_CONTACT_DPS: 14, // урон в секунду при касании
  ORB_VALUE: 1,
  XP_BASE_NEED: 8,
  XP_GROWTH: 1.35,
  MINI_BOSS_INTERVAL: 120, // сек — мини-босс каждые 2 минуты
  MAX_ENEMIES_ALIVE: 420,
  REVIVE_HP_RATIO: 0.5,
};

/** Формат MM:SS для таймера и рекордов. */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
