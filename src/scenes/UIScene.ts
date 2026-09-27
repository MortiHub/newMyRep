// ============================================================
// UIScene — оверлей над GameScene:
//  * HUD (HP, шкала опыта, таймер, килы, номер волны)
//  * экран Level Up (3 карточки навыков + skip)
//  * экран паузы
//  * экран смерти/результатов (ревайв и x3 награда через рекламу)
// Общается с GameScene через events менеджера сцен.
// ============================================================
import Phaser from 'phaser';
import { formatTime } from '../config/GameConfig';
import { YandexSDK } from '../systems/YandexSDK';
import { SFX } from '../systems/AudioManager';
import { t } from '../data/Localization';
import { ELEMENT_COLORS, SkillDef, getSkill } from '../data/SkillsData';

interface HudState {
  hp: number;
  maxHp: number;
  xp: number;
  xpNeed: number;
  level: number;
  time: number;
  kills: number;
  skills: [string, number][];
}

interface DeathStats {
  time: number;
  kills: number;
  level: number;
  skills: { id: string; lvl: number }[];
  canRevive: boolean;
  isRecord: boolean;
}

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private timeText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private skillIconsRow!: Phaser.GameObjects.Container;

  // слои-экраны
  private levelUpLayer!: Phaser.GameObjects.Container;
  private pauseLayer!: Phaser.GameObjects.Container;
  private deathLayer!: Phaser.GameObjects.Container;

  private gameScene: Phaser.Scene | null = null;

  constructor() {
    super('UI');
  }

  create(): void {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    // ---------- HUD ----------
    this.hpBar = this.add.graphics().setDepth(100);
    this.xpBar = this.add.graphics().setDepth(100);
    this.drawBars({ hp: 100, maxHp: 100, xp: 0, xpNeed: 8, level: 1, time: 0, kills: 0, skills: [] });

    this.timeText = this.mkText(W / 2, 26, '00:00', 26, '#aef3ff').setOrigin(0.5);
    this.killsText = this.mkText(16, 26, '', 16, '#ff8a1e');
    this.levelText = this.mkText(W - 16, 26, '', 16, '#7db9ff').setOrigin(1, 0);
    this.waveText = this.mkText(W / 2, 52, '', 14, '#5a7fb8').setOrigin(0.5);

    this.skillIconsRow = this.add.container(16, 52).setDepth(100);

    // Кнопка паузы
    const pauseBtn = this.add
      .text(W - 18, H - 20, '⏸', { fontSize: '30px', color: '#aef3ff' })
      .setOrigin(1, 1)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.();
      this.pauseGame();
    });

    // ---------- Экраны ----------
    this.levelUpLayer = this.buildLevelUpScreen(W, H);
    this.pauseLayer = this.buildPauseScreen(W, H);
    this.deathLayer = this.buildDeathScreen(W, H);

    // ---------- Подписка на события GameScene ----------
    this.events.on('hud:state', this.onHudState, this);
    this.events.on('hud:wave', this.onWave, this);
    this.events.on('ui:levelup', this.openLevelUp, this);
    this.events.on('ui:pause', this.showPauseOverlay, this);
    this.events.on('ui:death', this.openDeath, this);

    this.scale.on('resize', this.onResize, this);
    this.scene.getScenes(true).forEach((s) => {
      if (s.scene.key === 'Game') this.gameScene = s;
    });
  }

  private getGame(): Phaser.Scene | null {
    if (!this.gameScene || !this.gameScene.scene.isActive()) {
      this.gameScene = this.scene.getScene('Game');
    }
    return this.gameScene && this.gameScene.scene.isActive() ? this.gameScene : null;
  }

  private mkText(x: number, y: number, s: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, s, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setDepth(100);
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.timeText.setX(size.width / 2);
    this.levelText.setX(size.width - 16);
    this.waveText.setX(size.width / 2);
    const last = this.levelUpLayer.list[this.levelUpLayer.list.length - 1];
    void last;
    this.layoutScreen(this.levelUpLayer, size.width, size.height);
    this.layoutScreen(this.pauseLayer, size.width, size.height);
    this.layoutScreen(this.deathLayer, size.width, size.height);
  }

  /** Пересборка позиционирования полноэкранных контейнеров. */
  private layoutScreen(c: Phaser.GameObjects.Container, _w: number, _h: number): void {
    c.setPosition(0, 0);
    const dim = c.list[0] as Phaser.GameObjects.Rectangle | undefined;
    if (dim instanceof Phaser.GameObjects.Rectangle) {
      dim.setSize(this.cameras.main.width, this.cameras.main.height);
    }
  }

  // ==================== HUD ====================

  private onHudState = (s: HudState): void => {
    this.drawBars(s);
    this.timeText.setText(formatTime(s.time));
    this.killsText.setText(`${t('kills')}: ${s.kills}`);
    this.levelText.setText(`${t('level')} ${s.level}`);
    this.refreshSkillIcons(s.skills);
  };

  private onWave = (n: number): void => {
    this.waveText.setText(t('wave', { n }));
    this.tweens.add({
      targets: this.waveText,
      alpha: { from: 1, to: 0.6 },
      duration: 1200,
    });
  };

  private drawBars(s: HudState): { w: number } {
    const W = this.cameras.main.width;
    const barW = Math.min(320, W - 120);
    this.hpBar.clear();
    this.xpBar.clear();

    // HP — верх слева
    this.hpBar.fillStyle(0x1a0d12, 0.9);
    this.hpBar.fillRoundedRect(16, 12, barW, 18, 9);
    const hpRatio = Phaser.Math.Clamp(s.hp / s.maxHp, 0, 1);
    if (hpRatio > 0) {
      this.hpBar.fillStyle(0xff2b3d, 1);
      this.hpBar.fillRoundedRect(16, 12, Math.max(18, barW * hpRatio), 18, 9);
      this.hpBar.fillStyle(0xff8a96, 0.5);
      this.hpBar.fillRoundedRect(16, 12, Math.max(18, barW * hpRatio), 8, 6);
    }
    this.hpBar.lineStyle(1, 0xaef3ff, 0.4);
    this.hpBar.strokeRoundedRect(16, 12, barW, 18, 9);

    // XP — низ экрана
    const xpY = this.cameras.main.height - 18;
    this.xpBar.fillStyle(0x0d1226, 0.9);
    this.xpBar.fillRect(0, xpY, W, 18);
    const xpRatio = Phaser.Math.Clamp(s.xp / s.xpNeed, 0, 1);
    this.xpBar.fillStyle(0x1e6bff, 1);
    this.xpBar.fillRect(0, xpY, W * xpRatio, 18);
    this.xpBar.fillStyle(0xaef3ff, 0.6);
    this.xpBar.fillRect(0, xpY, W * xpRatio, 4);
    return { w: barW };
  }

  private refreshSkillIcons(skills: [string, number][]): void {
    this.skillIconsRow.removeAll(true);
    skills.forEach(([id, lvl], i) => {
      const def = getSkill(id);
      if (!def) return;
      const icon = this.add.image(i * 40, 0, def.icon).setScale(0.55);
      this.skillIconsRow.add(icon);
      if (lvl > 1) {
        const lv = this.add
          .text(i * 40 + 12, 12, `${lvl}`, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffe74a',
            stroke: '#000',
            strokeThickness: 2,
          })
          .setOrigin(0.5);
        this.skillIconsRow.add(lv);
      }
    });
  }

  // ==================== PAUSE ====================

  private pauseGame(): void {
    const g = this.getGame() as unknown as { pauseGame?: () => void } | null;
    g?.pauseGame?.();
  }

  private resumeGame(): void {
    const g = this.getGame() as unknown as { resumeGame?: () => void } | null;
    g?.resumeGame?.();
  }

  private showPauseOverlay = (show: boolean): void => {
    this.pauseLayer.setVisible(show);
  };

  private buildPauseScreen(W: number, H: number): Phaser.GameObjects.Container {
    const cont = this.add.container(0, 0).setDepth(200).setVisible(false);
    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
      .setInteractive(); // блокирует клики «насквозь»
    const title = this.mkText(W / 2, H * 0.38, t('paused'), 34, '#aef3ff').setOrigin(0.5);
    const btn = this.makeButton(W / 2, H * 0.55, t('resume'), () => {
      SFX.uiClick();
      this.resumeGame();
    });
    cont.add([dim, title, btn]);
    return cont;
  }

  /** Неоновая кнопка внутри UI-сцены. */
  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 260,
    height = 60,
    color = 0x1e6bff
  ): Phaser.GameObjects.Container {
    const cont = this.add.container(x, y);
    const body = this.add.graphics();
    body.fillStyle(color, 0.9).fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    body.lineStyle(2, 0xaef3ff, 0.9).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    const txt = this.mkText(0, 0, label, 18, '#ffffff').setOrigin(0.5);
    txt.setDepth(1);
    const hit = this.add.rectangle(0, 0, width, height).setInteractive({ useHandCursor: true });
    cont.add([body, txt, hit]);
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.();
      this.tweens.add({
        targets: cont,
        scale: 0.93,
        duration: 50,
        yoyo: true,
        onComplete: onClick,
      });
    });
    return cont;
  }

  // ==================== LEVEL UP ====================

  private buildLevelUpScreen(W: number, H: number): Phaser.GameObjects.Container {
    const cont = this.add.container(0, 0).setDepth(210).setVisible(false);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive();
    cont.add(dim);
    // карточки добавляются динамически
    return cont;
  }

  private openLevelUp = (payload: { level: number; choices: SkillDef[] }): void => {
    const layer = this.levelUpLayer;
    // удалить старые карточки (dim — первый элемент)
    while (layer.list.length > 1) {
      const obj = layer.list[layer.list.length - 1];
      obj.destroy();
    }
    layer.setVisible(true);

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const dim = layer.list[0] as Phaser.GameObjects.Rectangle;
    dim.setSize(W, H).setPosition(W / 2, H / 2);

    const title = this.mkText(W / 2, H * 0.14, t('level_up'), 30, '#ffe74a').setOrigin(0.5);
    const sub = this.mkText(W / 2, H * 0.14 + 34, t('choose_skill'), 15, '#aef3ff').setOrigin(0.5);
    layer.add([title, sub]);

    const portrait = H > W;
    const cardW = portrait ? Math.min(300, W - 40) : 220;
    const cardH = portrait ? 150 : 260;
    const gap = 16;

    payload.choices.forEach((sk, i) => {
      const cx = portrait
        ? W / 2
        : W / 2 + (i - 1) * (cardW + gap);
      const cy = portrait
        ? H * 0.28 + i * (cardH + gap)
        : H * 0.52;
      const card = this.makeSkillCard(cx, cy, cardW, cardH, sk);
      layer.add(card);
    });

    // Skip-кнопка (лечит вместо навыка)
    const skip = this.makeButton(
      W / 2,
      portrait ? H - 60 : H * 0.86,
      t('skip'),
      () => {
        SFX.uiClick();
        const g = this.getGame() as unknown as { hp: number; maxHp: number; applySkill?: (id: string) => void } | null;
        if (g) {
          g.hp = Math.min(g.maxHp, g.hp + 30);
          g.applySkill?.('__skip__'); // GameScene корректно закроет один pending level
        }
      },
      220,
      44,
      0x33415c
    );
    layer.add(skip);
  };

  private makeSkillCard(x: number, y: number, w: number, h: number, sk: SkillDef): Phaser.GameObjects.Container {
    const cont = this.add.container(x, y);
    const elemColor = ELEMENT_COLORS[sk.element];
    const bg = this.add.graphics();
    bg.fillStyle(0x0b1226, 0.97);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(3, elemColor, 0.95);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    // свечение элемента сверху
    bg.fillStyle(elemColor, 0.18);
    bg.fillRoundedRect(-w / 2, -h / 2, w, 46, { tl: 14, tr: 14, bl: 0, br: 0 });

    const icon = this.add.image(-w / 2 + 34, -h / 2 + 34, sk.icon).setScale(0.85);
    const name = this.mkText(-w / 2 + 66, -h / 2 + 22, t(sk.nameKey), 16, '#ffffff');
    name.setWordWrap(w - 76);
    const elemLabel = this.mkText(-w / 2 + 66, -h / 2 + 42, t(`elem_${sk.element}`), 11, '#' + elemColor.toString(16).padStart(6, '0'));
    const desc = this.mkText(-w / 2 + 14, -h / 2 + 64, t(sk.descKey), 13, '#9fb8e8');
    desc.setWordWrap(w - 28);

    cont.add([bg, icon, name, elemLabel, desc]);

    const hit = this.add.rectangle(0, 0, w, h).setInteractive({ useHandCursor: true });
    cont.add(hit);
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.stopPropagation?.();
      SFX.uiClick();
      const g = this.getGame() as unknown as { applySkill?: (id: string) => void } | null;
      g?.applySkill?.(sk.id);
    });
    return cont;
  }

  // ==================== DEATH ====================

  private buildDeathScreen(W: number, H: number): Phaser.GameObjects.Container {
    const cont = this.add.container(0, 0).setDepth(220).setVisible(false);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setInteractive();
    cont.add(dim);
    return cont;
  }

  private rewardMultiplier = 1;

  private openDeath = (stats: DeathStats): void => {
    const layer = this.deathLayer;
    while (layer.list.length > 1) layer.list[layer.list.length - 1].destroy();
    layer.setVisible(true);
    this.rewardMultiplier = 1;

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    (layer.list[0] as Phaser.GameObjects.Rectangle).setSize(W, H).setPosition(W / 2, H / 2);

    const title = this.mkText(W / 2, H * 0.12, t('you_died'), 36, '#ff2b3d').setOrigin(0.5);
    layer.add(title);

    let y = H * 0.22;
    const line = (txt: string, color = '#aef3ff', size = 16) => {
      const tt = this.mkText(W / 2, y, txt, size, color).setOrigin(0.5);
      layer.add(tt);
      y += size + 12;
    };

    if (stats.isRecord) line(t('new_record'), '#ffe74a', 20);
    line(t('survived', { time: formatTime(stats.time) }));
    line(t('killed', { kills: stats.kills }));
    line(t('reached_level', { lvl: stats.level }));

    // список навыков
    if (stats.skills.length) {
      line(t('skills_taken'), '#ff8a1e', 14);
      const names = stats.skills
        .map((s) => {
          const d = getSkill(s.id);
          return d ? `${t(d.nameKey)}${s.lvl > 1 ? ` Lv.${s.lvl}` : ''}` : '';
        })
        .filter(Boolean);
      const wrap = this.mkText(W / 2, y, names.join(' • '), 13, '#9fb8e8').setOrigin(0.5, 0);
      wrap.setWordWrap(W - 60);
      layer.add(wrap);
      y += 46;
    }

    y = Math.max(y, H * 0.56);

    // Воскрешение (реклама) — только раз за забег
    if (stats.canRevive) {
      const reviveBtn = this.makeButton(W / 2, y, `▶ ${t('revive_ad')}`, () => {
        SFX.uiClick();
        YandexSDK.showAd(
          () => {
            const g = this.getGame() as unknown as { revive?: () => void } | null;
            layer.setVisible(false);
            g?.revive?.();
          },
          () => this.toast(t('ad_error'))
        );
      }, 280, 54, 0x0f7a3d);
      layer.add(reviveBtn);
      y += 66;
    }

    // x3 награда (реклама): множитель рекорда «чакры» — здесь +бонус к очкам лидерборда
    const x3btn = this.makeButton(W / 2, y, `★ ${t('reward_x3_ad')}`, () => {
      SFX.uiClick();
      if (this.rewardMultiplier >= 3) return;
      YandexSDK.showAd(
        () => {
          this.rewardMultiplier = 3;
          YandexSDK.submitScore(stats.time * 3);
          this.toast(t('score_sent'));
          x3btn.setScale(0.9);
          x3btn.setAlpha(0.5);
        },
        () => this.toast(t('ad_error'))
      );
    }, 280, 54, 0x8a6d1a);
    layer.add(x3btn);
    y += 66;

    const retry = this.makeButton(W / 2, y, t('retry'), () => {
      SFX.uiClick();
      this.restartRun();
    }, 200, 52);
    layer.add(retry);

    const menu = this.makeButton(W / 2 + 0, y + 64, t('menu'), () => {
      SFX.uiClick();
      this.toMenu();
    }, 200, 44, 0x33415c);
    layer.add(menu);
  };

  private toast(msg: string): void {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const txt = this.mkText(W / 2, H * 0.9, msg, 15, '#ff8a1e').setOrigin(0.5).setDepth(300);
    this.tweens.add({
      targets: txt,
      alpha: 0,
      delay: 1200,
      duration: 400,
      onComplete: () => txt.destroy(),
    });
  }

  private restartRun(): void {
    this.deathLayer.setVisible(false);
    this.levelUpLayer.setVisible(false);
    this.pauseLayer.setVisible(false);
    const g = this.getGame();
    if (g) {
      g.scene.restart();
    } else {
      this.scene.start('Game');
      this.scene.restart();
    }
  }

  private toMenu(): void {
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('MainMenu');
  }

  override shutdown(): void {
    this.events.off('hud:state', this.onHudState, this);
    this.events.off('hud:wave', this.onWave, this);
    this.events.off('ui:levelup', this.openLevelUp, this);
    this.events.off('ui:pause', this.showPauseOverlay, this);
    this.events.off('ui:death', this.openDeath, this);
    this.scale.off('resize', this.onResize, this);
  }
}
