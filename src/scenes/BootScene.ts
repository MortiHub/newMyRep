// ============================================================
// BootScene: инициализация Yandex SDK, генерация ВСЕХ текстур
// процедурно (Graphics -> generateTexture), переход в меню.
// Игра не стартует, пока SDK не инициализирован.
// ============================================================
import Phaser from 'phaser';
import { YandexSDK } from '../systems/YandexSDK';
import { setLanguage, t } from '../data/Localization';

/** Все ключи текстур, создаваемые здесь. */
export const TEX = {
  pixel: 'pixel', // 1x1 белый — растягивается под любые бары/лучи
  glow: 'glow', // мягкий радиальный блик (Часть 2)
  tileGrid: 'tile_grid', // тайл фона-сетки (Часть 2)
  player: 'player_ninja', // светящийся ниндзя (Часть 3)
  enemyGrunt: 'enemy_grunt',
  enemyRunner: 'enemy_runner',
  enemyTank: 'enemy_tank',
  enemyBoss: 'enemy_boss',
  kunai: 'kunai',
  fireball: 'fireball',
  orb: 'chakra_orb',
  shuriken: 'shuriken', // лезвие ветра
  spike: 'rock_spike',
  icon_kunai: 'icon_kunai',
  icon_fireball: 'icon_fireball',
  icon_waterlance: 'icon_waterlance',
  icon_windblade: 'icon_windblade',
  icon_lightning: 'icon_lightning',
  icon_rockspike: 'icon_rockspike',
  icon_tornado: 'icon_tornado',
  icon_steamnova: 'icon_steamnova',
  icon_plasma: 'icon_plasma',
  icon_magma: 'icon_magma',
  icon_storm: 'icon_storm',
  icon_speed: 'icon_speed',
  icon_hp: 'icon_hp',
  icon_magnet: 'icon_magnet',
  icon_armor: 'icon_armor',
  icon_regen: 'icon_regen',
  icon_crit: 'icon_crit',
  icon_cooldown: 'icon_cooldown',
} as const;

export class BootScene extends Phaser.Scene {
  private progressLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('Boot');
  }

  preload(): void {
    // Никаких внешних файлов — только код.
    const camW = this.cameras.main.width || 800;
    this.progressLabel = this.add
      .text(camW / 2, 0, t('loading'), {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#35c9ff',
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.events.once(Phaser.Scenes.Events.UPDATE, () => {
      this.progressLabel.setY(this.cameras.main.height * 0.6);
    });
  }

  /**
   * Создание чистого HTMLCanvasElement.
   * ВАЖНО: не используем this.make.canvas — фабрика «canvas» зарегистрирована
   * только в режиме CANVAS/WebGL-canvas-текстур и в некоторых сборках Phaser
   * отсутствует, что роняло загрузку (this.make.canvas is not a function).
   */
  private makeCanvas(key: string, w: number, h: number): HTMLCanvasElement {
    if (this.textures.exists(key)) this.textures.remove(key);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  async create(): Promise<void> {
    // 1) Процедурные текстуры генерируем СРАЗУ — загрузка игры не зависит
    //    от сети/SDK (на случай долгой инициализации Яндекса).
    this.buildBasicTextures(); // Часть 1
    this.buildCharacterTextures(); // Часть 2
    this.buildProjectileTextures(); // Часть 3
    this.buildIconTextures(); // Часть 4

    // 2) SDK — строго до входа в меню (с внутренним таймаутом).
    try {
      await YandexSDK.init();
    } catch (e) {
      console.warn('[Boot] SDK init failed, continuing offline:', e);
    }
    setLanguage(YandexSDK.lang);
    if (this.progressLabel) this.progressLabel.setText(t('loading'));

    // 3) В меню
    this.time.delayedCall(120, () => {
      this.scene.start('MainMenu');
    });
  }

  // --------------------- ЧАСТЬ 1: базовые ---------------------
  private buildBasicTextures(): void {
    // 1x1 пиксель
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 1);
    pg.fillRect(0, 0, 1, 1);
    pg.generateTexture(TEX.pixel, 1, 1);
    pg.destroy();

    // Мягкое свечение 64x64 через CanvasGradient
    const c = this.makeCanvas('__glow_tmp', 64, 64);
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.textures.addCanvas(TEX.glow, c);
    // удалим временный key из менеджера нельзя (addCanvas забрал canvas), ок.

    // Тайл «неоновой сетки» пола 128x128
    const tc = this.makeCanvas('tile_grid', 128, 128);
    const tctx = tc.getContext('2d')!;
    tctx.fillStyle = '#070a16';
    tctx.fillRect(0, 0, 128, 128);
    tctx.strokeStyle = 'rgba(53,120,255,0.16)';
    tctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 32) {
      tctx.beginPath();
      tctx.moveTo(i, 0);
      tctx.lineTo(i, 128);
      tctx.stroke();
      tctx.beginPath();
      tctx.moveTo(0, i);
      tctx.lineTo(128, i);
      tctx.stroke();
    }
    // точки пересечения — «чакры»
    tctx.fillStyle = 'rgba(80,200,255,0.10)';
    for (let x = 0; x <= 128; x += 64) {
      for (let y = 0; y <= 128; y += 64) {
        tctx.beginPath();
        tctx.arc(x, y, 2, 0, Math.PI * 2);
        tctx.fill();
      }
    }
    this.textures.addCanvas(TEX.tileGrid, tc);
  }

  // --------------------- ЧАСТЬ 2: персонажи ---------------------
  private buildCharacterTextures(): void {
    const g = this.add.graphics();

    // Игрок — светящийся сине-оранжевый ниндзя (48x48)
    g.clear();
    // аура
    g.fillStyle(0x35c9ff, 0.18);
    g.fillCircle(24, 24, 22);
    // тело (плащ)
    g.fillStyle(0x0f2f55, 1);
    g.fillTriangle(24, 8, 8, 40, 40, 40);
    g.fillStyle(0x1b4d8c, 1);
    g.fillRoundedRect(14, 16, 20, 22, 6);
    // пояс-шарф оранжевый
    g.fillStyle(0xff8a1e, 1);
    g.fillRect(12, 30, 24, 5);
    // развивающийся конец шарфа
    g.fillTriangle(36, 30, 46, 24, 44, 34);
    // голова + маска
    g.fillStyle(0x1b4d8c, 1);
    g.fillCircle(24, 12, 8);
    g.fillStyle(0x0a1a30, 1);
    g.fillRect(16, 9, 16, 5);
    // глаза-чакра
    g.fillStyle(0xaef3ff, 1);
    g.fillRect(19, 10, 4, 3);
    g.fillRect(26, 10, 4, 3);
    // ободка кунай на лбу нет — чистый силуэт; контур свечения
    g.lineStyle(2, 0x35c9ff, 0.9);
    g.strokeRoundedRect(13, 15, 22, 24, 6);
    g.generateTexture(TEX.player, 48, 48);

    // Врачи-«грунты»: красные/черные силуэты 36x36
    this.buildEnemyShape(g, 36, 0x2a0508, 0xff2b3d, 0x120203);
    g.generateTexture(TEX.enemyGrunt, 36, 36);

    // Бегун: тоньше, ядовито-красный 28x28
    this.buildEnemyShape(g, 28, 0x33040a, 0xff5a2b, 0x140204);
    g.generateTexture(TEX.enemyRunner, 28, 28);

    // Танк: крупный, почти черный 52x52
    this.buildEnemyShape(g, 52, 0x160305, 0xd21e3c, 0x0a0102);
    g.generateTexture(TEX.enemyTank, 52, 52);

    // Мини-босс: рогатый демон 84x84
    g.clear();
    g.fillStyle(0x1a0204, 1);
    g.fillCircle(42, 46, 26);
    g.fillRoundedRect(18, 34, 48, 40, 10);
    // рога
    g.fillStyle(0x3d0a10, 1);
    g.fillTriangle(20, 30, 30, 8, 34, 30);
    g.fillTriangle(64, 30, 54, 8, 50, 30);
    // глаза
    g.fillStyle(0xffe74a, 1);
    g.fillCircle(32, 44, 5);
    g.fillCircle(52, 44, 5);
    g.fillStyle(0xff2b3d, 1);
    g.fillCircle(32, 44, 2.5);
    g.fillCircle(52, 44, 2.5);
    // печать на груди
    g.lineStyle(3, 0xff2b3d, 0.9);
    g.strokeCircle(42, 58, 9);
    g.lineStyle(2, 0xff2b3d, 0.7);
    g.strokeCircle(42, 58, 4);
    // красная аура
    g.lineStyle(3, 0xff2b3d, 0.5);
    g.strokeCircle(42, 46, 34);
    g.generateTexture(TEX.enemyBoss, 84, 84);

    g.destroy();
  }

  /** Общий конструктор вражеского силуэта. */
  private buildEnemyShape(
    g: Phaser.GameObjects.Graphics,
    size: number,
    body: number,
    accent: number,
    dark: number
  ): void {
    const c = size / 2;
    g.clear();
    g.fillStyle(body, 1);
    g.fillCircle(c, c, c - 3);
    g.fillStyle(dark, 1);
    g.fillCircle(c, c + 2, c - 7);
    // шипы-«руки»
    g.fillStyle(body, 1);
    g.fillTriangle(c - (c - 4), c, c - size * 0.05, c - size * 0.32, c - size * 0.05, c + size * 0.1);
    g.fillTriangle(c + (c - 4), c, c + size * 0.05, c - size * 0.32, c + size * 0.05, c + size * 0.1);
    // глаза
    g.fillStyle(accent, 1);
    g.fillCircle(c - size * 0.14, c - size * 0.1, Math.max(2, size * 0.07));
    g.fillCircle(c + size * 0.14, c - size * 0.1, Math.max(2, size * 0.07));
    // контур
    g.lineStyle(2, accent, 0.65);
    g.strokeCircle(c, c, c - 3);
  }

  // --------------------- ЧАСТЬ 3: снаряды ---------------------
  private buildProjectileTextures(): void {
    const g = this.add.graphics();

    // Кунай 24x8 (острием вправо — по направлению движения)
    g.clear();
    g.fillStyle(0xcfd8e3, 1);
    g.fillTriangle(24, 4, 12, 0, 12, 8);
    g.fillStyle(0x3a4658, 1);
    g.fillRect(2, 2, 9, 4);
    g.lineStyle(1, 0xaef3ff, 0.8);
    g.strokeTriangle(24, 4, 12, 0, 12, 8);
    g.generateTexture(TEX.kunai, 24, 8);

    // Огненный шар 28x28
    g.clear();
    g.fillStyle(0xff5a1e, 1);
    g.fillCircle(14, 14, 12);
    g.fillStyle(0xffb02e, 1);
    g.fillCircle(14, 14, 8);
    g.fillStyle(0xfff2b0, 1);
    g.fillCircle(11, 11, 4);
    g.generateTexture(TEX.fireball, 28, 28);

    // Сфера чакры 16x16
    g.clear();
    g.fillStyle(0x1e6bff, 0.9);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0x7db9ff, 1);
    g.fillCircle(8, 8, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 2);
    g.generateTexture(TEX.orb, 16, 16);

    // Сюрикен ветра 22x22
    g.clear();
    g.fillStyle(0x7dffc8, 0.95);
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      const cx = 11;
      const cy = 11;
      g.fillTriangle(
        cx,
        cy,
        cx + Math.cos(a - 0.5) * 10,
        cy + Math.sin(a - 0.5) * 10,
        cx + Math.cos(a + 0.2) * 10,
        cy + Math.sin(a + 0.2) * 10
      );
    }
    g.fillStyle(0x0a2f24, 1);
    g.fillCircle(11, 11, 3);
    g.generateTexture(TEX.shuriken, 22, 22);

    // Каменный шип 20x36
    g.clear();
    g.fillStyle(0xc98b4e, 1);
    g.fillTriangle(10, 0, 0, 36, 20, 36);
    g.fillStyle(0x8a5a2b, 1);
    g.fillTriangle(10, 6, 10, 36, 20, 36);
    g.lineStyle(1, 0xffd9a0, 0.6);
    g.strokeTriangle(10, 0, 0, 36, 20, 36);
    g.generateTexture(TEX.spike, 20, 36);

    g.destroy();
  }

  // --------------------- ЧАСТЬ 4: иконки навыков ---------------------
  private buildIconTextures(): void {
    const S = 64;
    const mk = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.add.graphics();
      // фон-ромб печати
      g.fillStyle(0x0b1226, 1);
      g.fillPoints(
        [
          { x: S / 2, y: 2 },
          { x: S - 2, y: S / 2 },
          { x: S / 2, y: S - 2 },
          { x: 2, y: S / 2 },
        ],
        true
      );
      g.lineStyle(2, 0x2a4a8f, 0.9);
      g.strokePoints(
        [
          { x: S / 2, y: 2 },
          { x: S - 2, y: S / 2 },
          { x: S / 2, y: S - 2 },
          { x: 2, y: S / 2 },
        ],
        true
      );
      draw(g);
      g.generateTexture(key, S, S);
      g.destroy();
    };

    const c = S / 2;

    mk(TEX.icon_kunai, (g) => {
      g.fillStyle(0xcfd8e3, 1);
      g.fillTriangle(S - 10, c, c, c - 10, c, c + 10);
      g.fillStyle(0x3a4658, 1);
      g.fillRect(14, c - 4, 16, 8);
    });
    mk(TEX.icon_fireball, (g) => {
      g.fillStyle(0xff5a1e, 1);
      g.fillCircle(c, c, 18);
      g.fillStyle(0xffb02e, 1);
      g.fillCircle(c, c, 12);
      g.fillStyle(0xfff2b0, 1);
      g.fillCircle(c - 5, c - 5, 5);
    });
    mk(TEX.icon_waterlance, (g) => {
      g.fillStyle(0x1e90ff, 0.95);
      g.fillTriangle(S - 10, c, 12, c - 12, 12, c + 12);
      g.fillStyle(0xaef3ff, 1);
      g.fillCircle(16, c, 6);
    });
    mk(TEX.icon_windblade, (g) => {
      g.lineStyle(4, 0x7dffc8, 0.95);
      g.beginPath();
      g.arc(c, c, 18, 0, Math.PI * 1.4);
      g.strokePath();
      g.beginPath();
      g.arc(c, c, 10, Math.PI, Math.PI * 2.2);
      g.strokePath();
    });
    mk(TEX.icon_lightning, (g) => {
      g.fillStyle(0xf8f24a, 1);
      g.fillPoints(
        [
          { x: c + 6, y: 10 },
          { x: c - 12, y: c + 4 },
          { x: c - 2, y: c + 4 },
          { x: c - 6, y: S - 10 },
          { x: c + 12, y: c - 4 },
          { x: c + 2, y: c - 4 },
        ],
        true
      );
    });
    mk(TEX.icon_rockspike, (g) => {
      g.fillStyle(0xc98b4e, 1);
      g.fillTriangle(c - 14, S - 12, c - 22, c + 6, c - 4, c + 6);
      g.fillTriangle(c + 2, S - 12, c - 6, c - 6, c + 12, c - 6);
      g.fillTriangle(c + 16, S - 12, c + 8, c + 8, c + 24, c + 8);
    });
    mk(TEX.icon_tornado, (g) => {
      g.lineStyle(4, 0xff5a1e, 0.9);
      for (let i = 0; i < 5; i++) {
        const w = 6 + i * 4;
        g.beginPath();
        g.ellipse(c, 16 + i * 8, w, 4, 0, 0, Math.PI * 2);
        g.strokePath();
      }
    });
    mk(TEX.icon_steamnova, (g) => {
      g.lineStyle(3, 0xbfe8ff, 0.9);
      g.strokeCircle(c, c, 20);
      g.fillStyle(0xff5a1e, 0.8);
      g.fillCircle(c, c, 8);
      g.fillStyle(0x1e90ff, 0.6);
      g.fillCircle(c - 14, c - 8, 5);
      g.fillCircle(c + 12, c + 10, 6);
    });
    mk(TEX.icon_plasma, (g) => {
      g.lineStyle(3, 0xf8f24a, 1);
      g.beginPath();
      g.moveTo(10, 14);
      g.lineTo(c, c);
      g.lineTo(20, S - 12);
      g.moveTo(c, c);
      g.lineTo(S - 10, 20);
      g.strokePath();
      g.fillStyle(0xaef3ff, 1);
      g.fillCircle(c, c, 5);
    });
    mk(TEX.icon_magma, (g) => {
      g.fillStyle(0x5a2a12, 1);
      g.fillRoundedRect(10, c, S - 20, 18, 6);
      g.fillStyle(0xff5a1e, 1);
      g.fillCircle(c - 10, c + 2, 6);
      g.fillCircle(c + 8, c - 2, 8);
    });
    mk(TEX.icon_storm, (g) => {
      g.fillStyle(0x7fa8d8, 1);
      g.fillCircle(c - 8, 22, 10);
      g.fillCircle(c + 8, 22, 12);
      g.fillStyle(0xf8f24a, 1);
      g.fillTriangle(c + 2, 32, c - 8, 48, c + 8, 44);
    });
    mk(TEX.icon_speed, (g) => {
      g.lineStyle(4, 0x7dffc8, 0.95);
      g.beginPath();
      g.moveTo(12, 20);
      g.lineTo(S - 16, 20);
      g.moveTo(12, c);
      g.lineTo(S - 8, c);
      g.moveTo(12, 44);
      g.lineTo(S - 20, 44);
      g.strokePath();
    });
    mk(TEX.icon_hp, (g) => {
      g.fillStyle(0xc98b4e, 1);
      g.fillRoundedRect(14, 14, S - 28, S - 28, 10);
      g.fillStyle(0x35c9ff, 1);
      g.fillRect(c - 4, 20, 8, 24);
      g.fillRect(20, c - 4, 24, 8);
    });
    mk(TEX.icon_magnet, (g) => {
      g.lineStyle(6, 0xff2b3d, 1);
      g.beginPath();
      g.arc(c, c + 4, 14, Math.PI, Math.PI * 2);
      g.strokePath();
      g.fillStyle(0xcfd8e3, 1);
      g.fillRect(c - 17, c + 2, 6, 12);
      g.fillRect(c + 11, c + 2, 6, 12);
    });
    mk(TEX.icon_armor, (g) => {
      g.fillStyle(0x3a5f8f, 1);
      g.fillPoints(
        [
          { x: c, y: 12 },
          { x: S - 14, y: 22 },
          { x: S - 14, y: c + 8 },
          { x: c, y: S - 12 },
          { x: 14, y: c + 8 },
          { x: 14, y: 22 },
        ],
        true
      );
      g.lineStyle(2, 0xaef3ff, 0.8);
      g.strokeLine(c, 16, c, S - 16);
    });
    mk(TEX.icon_regen, (g) => {
      g.lineStyle(4, 0x2effa7, 0.95);
      g.beginPath();
      g.arc(c, c, 16, 0.4, Math.PI * 1.7);
      g.strokePath();
      g.fillStyle(0x2effa7, 1);
      g.fillTriangle(c + 14, c - 12, c + 22, c - 4, c + 8, c - 4);
    });
    mk(TEX.icon_crit, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(c, c, 40, 24);
      g.fillStyle(0xff2b3d, 1);
      g.fillCircle(c, c, 9);
      g.fillStyle(0x120203, 1);
      g.fillCircle(c, c, 4);
    });
    mk(TEX.icon_cooldown, (g) => {
      g.lineStyle(4, 0xaef3ff, 0.95);
      g.strokeCircle(c, c, 18);
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c, c - 12);
      g.moveTo(c, c);
      g.lineTo(c + 8, c + 4);
      g.strokePath();
    });
  }
}
