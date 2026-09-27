// ============================================================
// MainMenuScene: логотип (процедурный), кнопка Играть, рекорд.
// Фон — анимированные частицы чакры.
// ============================================================
import Phaser from 'phaser';
import { YandexSDK } from '../systems/YandexSDK';
import { t } from '../data/Localization';
import { formatTime } from '../config/GameConfig';
import { SFX } from '../systems/AudioManager';

export class MainMenuScene extends Phaser.Scene {
  private playBtn!: Phaser.GameObjects.Container;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    // Затемнение снизу вверх
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1230, 0x0a1230, 0x05060d, 0x05060d, 1);
    bg.fillRect(0, 0, W, H);

    // Фоновая неоновая сетка (тайл) поверх
    const grid = this.add.tileSprite(0, 0, W, H, 'tile_grid').setOrigin(0);
    grid.setAlpha(0.5);
    this.tweens.add({
      targets: grid,
      tilePositionY: 128,
      duration: 6000,
      repeat: -1,
      ease: 'Linear',
    });

    // Частицы «чакры»
    const emitter = this.add.particles(0, 0, 'glow', {
      x: { min: 0, max: W },
      y: { min: 0, max: H },
      speed: { min: 4, max: 18 },
      scale: { min: 0.1, max: 0.5 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 4000,
      frequency: 120,
      quantity: 1,
      tint: [0x35c9ff, 0xff8a1e, 0x7dffc8],
      blendMode: 'ADD',
      emitting: true,
    });
    emitter.setDepth(1);

    // Декоративная спираль-печать за заголовком
    const seal = this.add.graphics();
    seal.lineStyle(3, 0x35c9ff, 0.35);
    seal.strokeCircle(W / 2, H * 0.3, 90);
    seal.lineStyle(2, 0xff8a1e, 0.3);
    seal.strokeCircle(W / 2, H * 0.3, 74);
    this.tweens.add({
      targets: seal,
      angle: 360,
      duration: 24000,
      repeat: -1,
      ease: 'Linear',
    });
    seal.setPosition(W / 2, H * 0.3);

    // Иконки-«бустеры» по кругу для атмосферы
    const iconKeys = ['icon_fireball', 'icon_lightning', 'icon_windblade', 'icon_rockspike'];
    iconKeys.forEach((k, i) => {
      const a = (Math.PI * 2 * i) / iconKeys.length - Math.PI / 2;
      const sp = this.add
        .image(W / 2 + Math.cos(a) * 130, H * 0.3 + Math.sin(a) * 130, k)
        .setScale(0.7)
        .setAlpha(0.85)
        .setDepth(2);
      this.tweens.add({
        targets: sp,
        angle: 360,
        y: sp.y - 8,
        duration: 3000 + i * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Заголовок
    this.add
      .text(W / 2, H * 0.16, t('game_title'), {
        fontFamily: 'monospace',
        fontSize: Math.min(44, W / 10) + 'px',
        color: '#aef3ff',
        stroke: '#1e6bff',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(W / 2, H * 0.16 + Math.min(44, W / 10), t('game_subtitle'), {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff8a1e',
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Рекорды
    const save = YandexSDK.saveData;
    const bestText =
      t('best_time', { time: formatTime(save.bestTime) }) +
      '   |   ' +
      t('best_kills', { kills: save.bestKills });
    this.add
      .text(W / 2, H * 0.52, bestText, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#7db9ff',
      })
      .setOrigin(0.5);

    // Кнопка PLAY
    this.playBtn = this.makeButton(W / 2, H * 0.66, t('play'), () => {
      SFX.unlock();
      SFX.uiClick();
      this.startGame();
    });

    // Подсказка
    const hint = this.add
      .text(W / 2, H * 0.82, t('tap_to_start'), {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#5a7fb8',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 });

    // Пересборка при ресайзе окна
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      bg.fillGradientStyle(0x0a1230, 0x0a1230, 0x05060d, 0x05060d, 1);
      bg.fillRect(0, 0, gameSize.width, gameSize.height);
      grid.setSize(gameSize.width, gameSize.height);
    });

    cam.fadeOut(400);
  }

  /** Универсальная неоновая кнопка-контейнер. */
  makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 220,
    height = 64,
    color = 0x1e6bff,
    textColor = '#aef3ff'
  ): Phaser.GameObjects.Container {
    const cont = this.add.container(x, y).setDepth(10);
    const body = this.add
      .graphics()
      .fillStyle(color)
      .fillRoundedRect(-width / 2, -height / 2, width, height, 14);
    const border = this.add
      .graphics()
      .lineStyle(2, 0xaef3ff, 0.8)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: textColor,
      })
      .setOrigin(0.5);

    cont.add([body, border, txt]);
    const hit = this.add
      .rectangle(0, 0, width, height)
      .setInteractive({ useHandCursor: true });
    cont.add(hit);

    hit.on('pointerover', () => cont.setScale(1.05));
    hit.on('pointerout', () => cont.setScale(1));
    hit.on('pointerdown', () => {
      this.tweens.add({
        targets: cont,
        scale: 0.92,
        duration: 60,
        yoyo: true,
        onComplete: onClick,
      });
    });
    return cont;
  }

  private startGame(): void {
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(260, () => {
      // Game и UI стартуют «снаружи», чтобы обе сцены гарантированно
      // создались даже если текущая сцена уже выгружается.
      this.scene.stop();
      this.scene.start('Game');
      this.scene.launch('UI');
    });
  }
}
