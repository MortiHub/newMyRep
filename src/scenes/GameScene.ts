// ============================================================
// GameScene — ядро геймплея: пулы объектов, физика, оружие,
// волны, опыт, стилистические комбо, смерть/воскрешение.
// ============================================================
import Phaser from 'phaser';
import { GAME_BALANCE } from '../config/GameConfig';
import { TEX } from './BootScene';
import { InputManager } from '../systems/InputManager';
import { WaveManager, EnemyType } from '../systems/WaveManager';
import { YandexSDK } from '../systems/YandexSDK';
import { SFX } from '../systems/AudioManager';
import {
  Element,
  SkillDef,
  getSkill,
  rollSkillChoices,
} from '../data/SkillsData';

/** Расширяем встроенные типы игровыми полями (без any). */
interface EnemySprite extends Phaser.GameObjects.Image {
  hp: number;
  maxHp: number;
  type: EnemyType;
  speedMul: number;
  knockX: number;
  knockY: number;
  hitFlashT: number;
  burnUntil: number;
  burnDps: number;
}
interface Projectile extends Phaser.GameObjects.Image {
  kindId: string; // id оружия-владельца
  damage: number;
  life: number;
  pierce: number;
  hitSet?: Set<string>; // для piercing (uid врагов)
  aoeRadius: number;
  homing: boolean;
}
interface OrbSprite extends Phaser.GameObjects.Image {
  value: number;
  pulled: boolean;
}

const ENEMY_STATS: Record<
  EnemyType,
  { hp: number; speed: number; dmg: number; xp: number; tex: string; body: number }
> = {
  grunt: { hp: 10, speed: 70, dmg: 12, xp: 1, tex: TEX.enemyGrunt, body: 24 },
  runner: { hp: 6, speed: 130, dmg: 9, xp: 1, tex: TEX.enemyRunner, body: 18 },
  tank: { hp: 45, speed: 45, dmg: 22, xp: 4, tex: TEX.enemyTank, body: 40 },
  miniboss: { hp: 320, speed: 55, dmg: 35, xp: 25, tex: TEX.enemyBoss, body: 60 },
};

let UID = 1;

export class GameScene extends Phaser.Scene {
  // --- объекты ---
  private player!: Phaser.GameObjects.Image;
  private playerGlow!: Phaser.GameObjects.Image;
  private bgTile!: Phaser.GameObjects.TileSprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private orbs!: Phaser.Physics.Arcade.Group;
  private effects!: Phaser.GameObjects.Layer;

  // --- системы ---
  private inputMgr!: InputManager;
  private waveMgr!: WaveManager;
  private particlesOn = true;

  // --- состояние игрока ---
  hp = GAME_BALANCE.PLAYER_BASE_HP;
  maxHp = GAME_BALANCE.PLAYER_BASE_HP;
  level = 1;
  xp = 0;
  xpNeed = GAME_BALANCE.XP_BASE_NEED;
  kills = 0;
  runTime = 0;
  private speedMul = 1;
  private armorMul = 1;
  private regenPerSec = 0;
  private magnetMul = 1;
  private critChance = 0.05;
  private cooldownMul = 1;
  private invulnUntil = 0;
  private revivedOnce = false;

  /** id -> уровень выбранных навыков */
  ownedSkills = new Map<string, number>();
  elementsInBuild = new Set<Element>();
  private weaponTimers = new Map<string, number>();
  private windbladeAngle = 0;
  private pendingLevels = 0;
  paused_ = false;
  gameOver = false;

  constructor() {
    super('Game');
  }

  create(): void {
    const cam = this.cameras.main;

    // Фон — бесконечная неоновая сетка
    this.bgTile = this.add
      .tileSprite(0, 0, cam.width * 2, cam.height * 2, TEX.tileGrid)
      .setOrigin(0.5)
      .setDepth(-10);

    this.effects = this.add.layer().setDepth(50);

    // Игрок
    this.player = this.add
      .image(cam.width / 2, cam.height / 2, TEX.player)
      .setDepth(20);
    this.playerGlow = this.add
      .image(this.player.x, this.player.y, TEX.glow)
      .setTint(0x35c9ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.6)
      .setScale(1.6)
      .setDepth(19);

    this.physics.add.existing(this.player);
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    pb.setCircle(GAME_BALANCE.PLAYER_RADIUS, this.player.width / 2 - GAME_BALANCE.PLAYER_RADIUS, this.player.height / 2 - GAME_BALANCE.PLAYER_RADIUS);
    pb.setMaxVelocity(1000);

    // Пулы (object pooling из коробки Arcade Group)
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.projectiles = this.physics.add.group();
    this.orbs = this.physics.add.group();

    // Частицы окружения (пыль чакры) — отключаются на слабых устройствах
    try {
      const dust = this.add.particles(0, 0, TEX.glow, {
        x: { min: 0, max: cam.width },
        y: { min: 0, max: cam.height },
        speed: { min: 2, max: 10 },
        scale: { min: 0.05, max: 0.18 },
        alpha: { start: 0.25, end: 0 },
        lifespan: 5000,
        frequency: 260,
        tint: [0x1e6bff, 0xff8a1e],
        blendMode: 'ADD',
        followCamera: true,
      });
      dust.setDepth(5);
    } catch {
      this.particlesOn = false;
    }

    // Ввод
    this.inputMgr = new InputManager(this);

    // Волны
    this.waveMgr = new WaveManager(
      (req) => this.spawnEnemy(req.type, req.x + this.player.x, req.y + this.player.y),
      (w) => this.events.emit('hud:wave', w),
      () => this.enemies.countActive(true)
    );

    // Коллизии
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) =>
      this.onProjectileHitEnemy(proj as Projectile, enemy as EnemySprite)
    );
    this.physics.add.overlap(this.player, this.enemies, (_p, enemy) =>
      this.onPlayerTouchEnemy(enemy as EnemySprite)
    );
    this.physics.add.overlap(this.player, this.orbs, (_p, orb) =>
      this.collectOrb(orb as OrbSprite)
    );

    // Стартовое оружие
    this.addSkillToBuild('kunai');

    // SDK gameplay + события UI
    YandexSDK.gameplayStart();
    this.events.on('resume-request', this.resumeGame, this);
    this.events.on('skill-picked', this.applySkill, this);

    // Потеря фокуса — автопауза
    this.offFocus = YandexSDK.onLostFocus((has) => {
      if (!has && !this.gameOver && !this.paused_) this.pauseGame();
    });

    // Ресайз
    this.onResizeHandler = (size: Phaser.Structs.Size) => {
      this.bgTile.setSize(size.width * 2, size.height * 2);
    };
    this.scale.on('resize', this.onResizeHandler);

    this.resetRunState();
    cam.fadeIn(400);
    this.soundTrail();
  }

  private offFocus!: () => void;
  private onResizeHandler!: (size: Phaser.Structs.Size) => void;

  /** Тонкий шлейф за игроком (неоновый след ниндзя). */
  private soundTrail(): void {
    if (!this.particlesOn) return;
    try {
      this.add
        .particles(0, 0, TEX.glow, {
          speed: { min: 4, max: 20 },
          scale: { start: 0.25, end: 0 },
          alpha: { start: 0.5, end: 0 },
          lifespan: 500,
          frequency: 60,
          quantity: 1,
          tint: 0x35c9ff,
          blendMode: 'ADD',
        })
        .startFollow(this.player);
    } catch {
      /* noop */
    }
  }

  private resetRunState(): void {
    this.hp = this.maxHp = GAME_BALANCE.PLAYER_BASE_HP;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = GAME_BALANCE.XP_BASE_NEED;
    this.kills = 0;
    this.runTime = 0;
    this.speedMul = 1;
    this.armorMul = 1;
    this.regenPerSec = 0;
    this.magnetMul = 1;
    this.critChance = 0.05;
    this.cooldownMul = 1;
    this.invulnUntil = 0;
    this.revivedOnce = false;
    this.pendingLevels = 0;
    this.paused_ = false;
    this.gameOver = false;
    this.ownedSkills.clear();
    this.elementsInBuild.clear();
    this.weaponTimers.clear();
  }

  // ==================== ЦИКЛ ====================

  update(time: number, delta: number): void {
    if (this.paused_ || this.gameOver) return;
    const dt = Math.min(delta, 50) / 1000; // защита от «скачков» после паузы
    this.runTime += dt;

    // Движение
    this.inputMgr.update();
    const v = this.inputMgr.pointer;
    const speed = GAME_BALANCE.PLAYER_BASE_SPEED * this.speedMul;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(v.x * speed, v.y * speed);
    this.player.setFlipX(v.x < -0.05 ? true : v.x > 0.05 ? false : this.player.flipX);

    // Камера следует за игроком
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.bgTile.setPosition(this.player.x - this.cameras.main.width, this.player.y - this.cameras.main.height);
    this.playerGlow.setPosition(this.player.x, this.player.y);
    this.playerGlow.setAlpha(0.45 + 0.15 * Math.sin(time / 200));

    // Реген
    if (this.regenPerSec > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenPerSec * dt);
      this.emitHud();
    }

    // Враги — самонаведение на игрока + нокаут + горение
    const halfW = this.cameras.main.width / 2;
    const halfH = this.cameras.main.height / 2;
    let alive = 0;
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemySprite;
      if (!e.active) return;
      alive++;
      const eb = e.body as Phaser.Physics.Arcade.Body;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const stats = ENEMY_STATS[e.type];
      const sp = stats.speed * e.speedMul;
      eb.setVelocity((dx / d) * sp + e.knockX, (dy / d) * sp + e.knockY);
      e.knockX *= 0.85;
      e.knockY *= 0.85;
      // flash after hit
      if (e.hitFlashT > 0) {
        e.hitFlashT -= dt;
        if (e.hitFlashT <= 0) e.clearTint();
      }
      // burn (magma/fire DoT)
      if (e.burnUntil > this.runTime) {
        this.damageEnemy(e, e.burnDps * dt, false);
      }
      // убрал слишком далеко уплывших (после отталкивания боссом)
      if (d > (halfW + halfH) * 3) {
        this.releaseEnemy(e);
      }
    });

    // Оружие по таймерам
    for (const [id, lvl] of this.ownedSkills) {
      const def = getSkill(id);
      if (!def || (def.kind !== 'weapon' && def.kind !== 'combo')) continue;
      const tCur = (this.weaponTimers.get(id) ?? 0) - dt;
      if (tCur <= 0) {
        this.fireWeapon(def, lvl);
        const cd = def.baseCooldown * this.cooldownMul * Math.max(0.55, 1 - lvl * 0.06);
        this.weaponTimers.set(id, cd);
      } else {
        this.weaponTimers.set(id, tCur);
      }
    }

    // Вращающиеся лезвия ветра
    this.updateWindblades(dt, time);

    // Таймеры снарядов (lifetime)
    this.projectiles.getChildren().forEach((obj) => {
      const p = obj as Projectile;
      if (!p.active) return;
      p.life -= dt;
      if (p.life <= 0) this.releaseProjectile(p);
    });

    // Сферы чакры — притяжение к игроку в радиусе магнита
    const pullR = GAME_BALANCE.PLAYER_PICKUP_BASE * this.magnetMul;
    const pullR2 = pullR * pullR;
    this.orbs.getChildren().forEach((obj) => {
      const o = obj as OrbSprite;
      if (!o.active) return;
      const dx = this.player.x - o.x;
      const dy = this.player.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (o.pulled || d2 < pullR2) {
        o.pulled = true;
        const ob = o.body as Phaser.Physics.Arcade.Body;
        const d = Math.sqrt(d2) || 1;
        ob.setVelocity((dx / d) * 420, (dy / d) * 420);
      }
    });

    // Волны (позиции спавна — вокруг игрока)
    this.waveMgr.update(dt, halfW, halfH);

    // Периодический HUD
    this.hudAccum += dt;
    if (this.hudAccum > 0.2) {
      this.hudAccum = 0;
      this.emitHud();
    }
  }

  private hudAccum = 0;

  private emitHud(): void {
    this.events.emit('hud:state', {
      hp: this.hp,
      maxHp: this.maxHp,
      xp: this.xp,
      xpNeed: this.xpNeed,
      level: this.level,
      time: this.runTime,
      kills: this.kills,
      skills: [...this.ownedSkills.entries()],
    });
  }

  // ==================== ПАУЗА / RESIZE ====================

  pauseGame(): void {
    if (this.paused_ || this.gameOver) return;
    this.paused_ = true;
    this.physics.pause();
    YandexSDK.gameplayStop();
    this.events.emit('ui:pause', true);
  }

  resumeGame(): void {
    if (!this.paused_) return;
    this.paused_ = false;
    this.physics.resume();
    YandexSDK.gameplayStart();
    this.events.emit('ui:pause', false);
  }

  // ==================== СПАВН / ПУЛЫ ====================

  private spawnEnemy(type: EnemyType, x: number, y: number): void {
    const stats = ENEMY_STATS[type];
    const stageScale = 1 + this.runTime / 90; // HP растет со временем

    let e = this.findDead<EnemySprite>(this.enemies);
    if (!e) {
      if (this.enemies.countActive(true) >= GAME_BALANCE.MAX_ENEMIES_ALIVE + 60) {
        return; // переполнение — пропускаем спавн
      }
      e = this.enemies.create(x, y, stats.tex) as EnemySprite;
      this.physics.add.existing(e);
    } else {
      e.enable(x, y, true, true);
      e.setTexture(stats.tex);
    }

    const eb = e.body as Phaser.Physics.Arcade.Body;
    eb.setCircle(stats.body / 2, e.width / 2 - stats.body / 2, e.height / 2 - stats.body / 2);
    eb.setCollideWorldBounds(false);
    eb.allowGravity = false;

    e.type = type;
    e.maxHp = stats.hp * stageScale;
    e.hp = e.maxHp;
    e.speedMul = 1 + Math.min(0.6, this.runTime / 600);
    e.knockX = 0;
    e.knockY = 0;
    e.hitFlashT = 0;
    e.burnUntil = 0;
    e.burnDps = 0;
    e.setDepth(15);
    e.setAlpha(1);
    e.clearTint();
    e.setData('uid', UID++);
  }

  /** Поиск свободного (неактивного) объекта в пуле группы. */
  private findDead<T extends Phaser.GameObjects.Sprite>(group: Phaser.Physics.Arcade.Group): T | null {
    const children = group.getChildren() as unknown as T[];
    for (let i = 0; i < children.length; i++) {
      if (!children[i].active) return children[i];
    }
    return null;
  }

  private releaseEnemy(e: EnemySprite): void {
    e.disable();
    e.setVisible(false);
    e.setActive(false);
  }

  // ==================== БОЙ ====================

  private nearestEnemy(maxDist = 600): EnemySprite | null {
    let best: EnemySprite | null = null;
    let bestD = maxDist * maxDist;
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemySprite;
      if (!e.active) return;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = e;
      }
    });
    return best;
  }

  private randomEnemies(count: number, maxDist = 420): EnemySprite[] {
    const pool: EnemySprite[] = [];
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemySprite;
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < maxDist) pool.push(e);
    });
    Phaser.Utils.Array.Shuffle(pool);
    return pool.slice(0, count);
  }

  private makeProjectile(texKey: string, x: number, y: number): Projectile {
    let p = this.findDead<Projectile>(this.projectiles);
    if (!p) {
      p = this.projectiles.create(x, y, texKey) as Projectile;
      this.physics.add.existing(p);
    } else {
      p.enable(x, y, true, true);
      p.setTexture(texKey);
    }
    const pb = p.body as Phaser.Physics.Arcade.Body;
    pb.setAllowGravity(false);
    pb.setSize(14, 14);
    p.setDepth(18);
    p.rotation = 0;
    p.setScale(1);
    p.setAlpha(1);
    p.angle = 0;
    return p;
  }

  private releaseProjectile(p: Projectile): void {
    p.disable();
    p.setVisible(false);
    p.setActive(false);
  }

  /** Единая точка «выстрела» оружия. */
  private fireWeapon(def: SkillDef, lvl: number): void {
    const dmg = def.baseDamage * (1 + (lvl - 1) * 0.35);
    const target = this.nearestEnemy(700);

    switch (def.id) {
      case 'kunai': {
        const n = Math.min(1 + Math.floor(lvl / 2), 4);
        const targets = this.randomEnemies(n, 700);
        for (let i = 0; i < n; i++) {
          const tg = targets[i % Math.max(1, targets.length)] ?? target;
          this.throwKunai(dmg, tg, def.id);
        }
        SFX.shoot();
        break;
      }
      case 'fireball':
      case 'tornado': {
        if (!target && def.id === 'fireball') return;
        if (def.id === 'fireball') {
          const p = this.makeProjectile(TEX.fireball, this.player.x, this.player.y);
          const dir = new Phaser.Math.Vector2(
            (target?.x ?? this.player.x + 100) - this.player.x,
            (target?.y ?? this.player.y) - this.player.y
          ).normalize();
          (p.body as Phaser.Physics.Arcade.Body).setVelocity(dir.x * 320, dir.y * 320);
          p.rotation = Math.atan2(dir.y, dir.x);
          p.kindId = def.id;
          p.damage = dmg;
          p.life = 3;
          p.pierce = 0;
          p.aoeRadius = 70 + lvl * 8;
          p.homing = false;
        } else {
          // ОГНЕННЫЙ ТОРНАДО: спавнится у игрока, движется к цели, жжет AoE
          const p = this.makeProjectile(TEX.fireball, this.player.x, this.player.y - 20);
          p.setScale(2.2);
          p.setTint(0xffb02e);
          const dir = new Phaser.Math.Vector2(
            (target?.x ?? this.player.x + 60) - this.player.x,
            (target?.y ?? this.player.y) - this.player.y
          ).normalize();
          (p.body as Phaser.Physics.Arcade.Body).setVelocity(dir.x * 180, dir.y * 180);
          p.kindId = def.id;
          p.damage = dmg;
          p.life = 4;
          p.pierce = 9999;
          p.aoeRadius = 120 + lvl * 15;
          p.homing = false;
          this.spawnBurst(p.x, p.y, 0xff5a1e, 6);
        }
        SFX.explosion();
        break;
      }
      case 'waterlance':
      case 'stormcall': {
        if (!target) return;
        const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        const len = 260 + lvl * 40;
        const width = def.id === 'stormcall' ? 90 : 46;
        // «луч» из растянутых пикселей-снарядов с pierce
        const p = this.makeProjectile(TEX.pixel, this.player.x, this.player.y);
        p.setDisplaySize(len, width);
        p.setTint(def.id === 'stormcall' ? 0x7fd0ff : 0x1e90ff);
        p.setAlpha(0.85);
        p.rotation = angle;
        (p.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        (p.body as Phaser.Physics.Arcade.Body).setSize(len, width, true);
        p.kindId = def.id;
        p.damage = dmg;
        p.life = 0.28;
        p.pierce = 9999;
        p.aoeRadius = 0;
        p.homing = false;
        p.hitSet = new Set();
        // мгновенный хит по линии
        this.hitscanLine(angle, len, width / 2 + 14, dmg, def.id);
        this.spawnBurst(target.x, target.y, 0x1e90ff, 5);
        SFX.hit();
        break;
      }
      case 'steamnova': {
        // взрыв пара вокруг игрока
        const r = 140 + lvl * 25;
        this.enemies.getChildren().forEach((obj) => {
          const e = obj as EnemySprite;
          if (!e.active) return;
          if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < r) {
            this.damageEnemy(e, dmg, true);
            this.knockback(e, this.player.x, this.player.y, 260);
          }
        });
        this.spawnRing(this.player.x, this.player.y, r, 0xbfe8ff);
        SFX.explosion();
        break;
      }
      case 'lightning':
      case 'plasma': {
        const n = def.id === 'plasma' ? 2 + lvl : 1 + Math.floor(lvl / 2);
        const targets = this.randomEnemies(n, def.id === 'plasma' ? 520 : 380);
        for (const tg of targets) {
          this.drawLightning(this.player.x, this.player.y, tg.x, tg.y);
          this.damageEnemy(tg, dmg, true);
          this.spawnBurst(tg.x, tg.y, 0xf8f24a, 4);
        }
        if (targets.length) SFX.hit();
        break;
      }
      case 'rockspike':
      case 'magma': {
        const r = 110 + lvl * 18;
        let hitAny = false;
        this.enemies.getChildren().forEach((obj) => {
          const e = obj as EnemySprite;
          if (!e.active) return;
          if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < r) {
            this.damageEnemy(e, dmg, true);
            this.knockback(e, this.player.x, this.player.y, 180);
            if (def.id === 'magma') {
              e.burnUntil = this.runTime + 2.5 + lvl * 0.5;
              e.burnDps = dmg * 0.3;
            }
            hitAny = true;
          }
        });
        // визуальные шипы через пул эффектов (простые спрайты с самоуничтожением)
        const spikes = 6 + lvl;
        for (let i = 0; i < spikes; i++) {
          const a = (Math.PI * 2 * i) / spikes;
          const sx = this.player.x + Math.cos(a) * r * 0.7;
          const sy = this.player.y + Math.sin(a) * r * 0.7;
          const sp = this.add.image(sx, sy, TEX.spike).setDepth(16);
          sp.setTint(def.id === 'magma' ? 0xff5a1e : 0xc98b4e);
          this.tweens.add({
            targets: sp,
            scaleY: 1.3,
            alpha: 0,
            duration: 500,
            onComplete: () => sp.destroy(),
          });
        }
        if (hitAny) SFX.kill();
        break;
      }
    }
  }

  private throwKunai(dmg: number, target: EnemySprite | null, kindId: string): void {
    const p = this.makeProjectile(TEX.kunai, this.player.x, this.player.y);
    const dir = new Phaser.Math.Vector2(
      (target?.x ?? this.player.x + 120) - this.player.x,
      (target?.y ?? this.player.y) - this.player.y
    ).normalize();
    const b = p.body as Phaser.Physics.Arcade.Body;
    b.setVelocity(dir.x * 520, dir.y * 520);
    p.rotation = Math.atan2(dir.y, dir.x);
    p.kindId = kindId;
    p.damage = dmg;
    p.life = 1.6;
    p.pierce = 0;
    p.aoeRadius = 0;
    p.homing = false;
  }

  /** Мгновенное поражение по линии (водяное копье). */
  private hitscanLine(angle: number, len: number, halfWidth: number, dmg: number, kindId: string): void {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemySprite;
      if (!e.active) return;
      const rx = e.x - this.player.x;
      const ry = e.y - this.player.y;
      const proj = rx * dirX + ry * dirY;
      if (proj < 0 || proj > len) return;
      const perp = Math.abs(-rx * dirY + ry * dirX);
      if (perp < halfWidth) {
        this.damageEnemy(e, dmg, true);
        this.knockback(e, this.player.x, this.player.y, 120);
      }
    });
    void kindId;
  }

  private updateWindblades(dt: number, _time: number): void {
    const lvl = this.ownedSkills.get('windblade');
    if (!lvl) return;
    const def = getSkill('windblade')!;
    const count = 1 + Math.floor(lvl / 2);
    const radius = 90 + lvl * 12;
    this.windbladeAngle += dt * 3.2;
    const dmg = def.baseDamage * (1 + (lvl - 1) * 0.35);

    // позиции лезвий — визуализация через простые images с переиспользованием
    for (let i = 0; i < count; i++) {
      const a = this.windbladeAngle + (Math.PI * 2 * i) / count;
      const bx = this.player.x + Math.cos(a) * radius;
      const by = this.player.y + Math.sin(a) * radius;
      const key = `wb_${i}`;
      let img = this.children.list.find(
        (c) => c instanceof Phaser.GameObjects.Image && c.texture.key === TEX.shuriken && c.getData('slot') === key
      ) as Phaser.GameObjects.Image | undefined;
      if (!img) {
        img = this.add.image(bx, by, TEX.shuriken).setDepth(17);
        img.setData('slot', key);
      }
      img.setPosition(bx, by);
      img.setRotation(img.rotation + dt * 12);
      // урон врагам рядом с лезвием (не чаще раза в 0.3с на врага — через hitFlashT)
      this.enemies.getChildren().forEach((obj) => {
        const e = obj as EnemySprite;
        if (!e.active || e.hitFlashT > 0) return;
        if (Phaser.Math.Distance.Between(e.x, e.y, bx, by) < 26) {
          this.damageEnemy(e, dmg, true);
          this.knockback(e, this.player.x, this.player.y, 90);
        }
      });
    }
  }

  // ---------------- урон по врагам ----------------

  private onProjectileHitEnemy(proj: Projectile, enemy: EnemySprite): void {
    if (!proj.active || !enemy.active) return;
    // луч waterlance уже обработан hitscan'ом — игнорируем физ-оверлап
    if (proj.kindId === 'waterlance' || proj.kindId === 'stormcall') return;

    this.damageEnemy(enemy, proj.damage, true);
    this.knockback(enemy, proj.x, proj.y, 140);

    if (proj.aoeRadius > 0) {
      // AoE-урон (fireball / tornado)
      this.enemies.getChildren().forEach((obj) => {
        const e = obj as EnemySprite;
        if (!e.active || e === enemy) return;
        if (Phaser.Math.Distance.Between(e.x, e.y, proj.x, proj.y) < proj.aoeRadius) {
          this.damageEnemy(e, proj.damage * 0.6, true);
        }
      });
      this.spawnRing(proj.x, proj.y, proj.aoeRadius, 0xff5a1e);
      this.spawnBurst(proj.x, proj.y, 0xffb02e, 8);
    }

    if (proj.pierce > 0) {
      proj.pierce--;
      // торнадо не исчезает — проходит сквозь
      if (proj.kindId === 'tornado') {
        // кулдаун повторного урона: сместим tiny
        return;
      }
    }
    this.releaseProjectile(proj);
  }

  private damageEnemy(e: EnemySprite, amount: number, canCrit: boolean): void {
    let dmg = amount;
    if (canCrit && Math.random() < this.critChance) {
      dmg *= 2;
      this.showFloatingText(e.x, e.y - 20, `${Math.round(dmg)}`, '#ffe74a');
    } else if (canCrit) {
      this.showFloatingText(e.x, e.y - 16, `${Math.round(dmg)}`, '#aef3ff');
    }
    e.hp -= dmg;
    e.hitFlashT = 0.12;
    e.setTintFill(0xffffff);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: EnemySprite): void {
    const stats = ENEMY_STATS[e.type];
    this.kills++;
    SFX.kill();

    // Взрыв частиц
    this.spawnBurst(e.x, e.y, e.type === 'miniboss' ? 0xffe74a : 0xff2b3d, e.type === 'miniboss' ? 24 : 8);

    // Дроп сфер чакры
    const orbCount = e.type === 'miniboss' ? 12 : Math.random() < 0.15 ? 2 : 1;
    for (let i = 0; i < orbCount; i++) {
      this.spawnOrb(
        e.x + Phaser.Math.Between(-14, 14),
        e.y + Phaser.Math.Between(-14, 14),
        stats.xp
      );
    }

    if (e.type === 'miniboss') {
      // щедрый дроп + тряска камеры
      this.cameras.main.shake(250, 0.01);
      this.flashScreen(0xff2b3d, 120);
    }
    this.releaseEnemy(e);
    this.emitHud();
  }

  private knockback(e: EnemySprite, fromX: number, fromY: number, force: number): void {
    const dx = e.x - fromX;
    const dy = e.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    e.knockX += (dx / d) * force;
    e.knockY += (dy / d) * force;
  }

  // ---------------- урон игроку ----------------

  private onPlayerTouchEnemy(enemy: EnemySprite): void {
    if (!enemy.active || this.gameOver) return;
    if (this.runTime < this.invulnUntil) return;
    const stats = ENEMY_STATS[enemy.type];
    const dmg = stats.dmg * this.armorMul;
    this.hp -= dmg;
    this.invulnUntil = this.runTime + 0.35;
    this.player.setTintFill(0xff2b3d);
    this.time.delayedCall(90, () => this.player.clearTint());
    this.knockback(enemy, this.player.x, this.player.y, 300);
    SFX.hurt();
    this.cameras.main.shake(60, 0.004);
    this.emitHud();
    if (this.hp <= 0) this.onPlayerDeath();
  }

  // ---------------- сферы опыта ----------------

  private spawnOrb(x: number, y: number, value: number): void {
    let o = this.findDead<OrbSprite>(this.orbs);
    if (!o) {
      o = this.orbs.create(x, y, TEX.orb) as OrbSprite;
      this.physics.add.existing(o);
    } else {
      o.enable(x, y, true, true);
    }
    const ob = o.body as Phaser.Physics.Arcade.Body;
    ob.setAllowGravity(false);
    ob.setSize(14, 14);
    ob.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(-40, 40));
    o.value = value;
    o.pulled = false;
    o.setDepth(12);
    o.setAlpha(1);
    o.setScale(1);
  }

  private collectOrb(o: OrbSprite): void {
    if (!o.active) return;
    this.xp += o.value * GAME_BALANCE.ORB_VALUE;
    SFX.orb();
    o.disable();
    o.setVisible(false);
    o.setActive(false);

    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = Math.floor(GAME_BALANCE.XP_BASE_NEED * Math.pow(GAME_BALANCE.XP_GROWTH, this.level - 1));
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && !this.paused_) this.openLevelUp();
    this.emitHud();
  }

  // ---------------- эффекты ----------------

  private spawnBurst(x: number, y: number, color: number, count: number): void {
    if (!this.particlesOn) return;
    try {
      const emitter = this.add.particles(x, y, TEX.glow, {
        speed: { min: 60, max: 220 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 420,
        quantity: count,
        emitting: false,
        tint: color,
        blendMode: 'ADD',
      });
      emitter.explode(count);
      this.time.delayedCall(600, () => emitter.destroy());
    } catch {
      /* noop */
    }
  }

  private spawnRing(x: number, y: number, r: number, color: number): void {
    const g = this.add.graphics().setDepth(30).setPosition(x, y);
    g.lineStyle(4, color, 0.9);
    g.strokeCircle(0, 0, 10);
    this.tweens.add({
      targets: g,
      scale: r / 10,
      alpha: 0,
      duration: 320,
      onComplete: () => g.destroy(),
    });
  }

  private drawLightning(x1: number, y1: number, x2: number, y2: number): void {
    const g = this.add.graphics().setDepth(31);
    g.lineStyle(3, 0xf8f24a, 1);
    g.beginPath();
    g.moveTo(x1, y1);
    const segs = 5;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const mx = x1 + (x2 - x1) * t + (i < segs ? Phaser.Math.Between(-16, 16) : 0);
      const my = y1 + (y2 - y1) * t + (i < segs ? Phaser.Math.Between(-16, 16) : 0);
      g.lineTo(mx, my);
    }
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() });
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    if (!this.particlesOn) return;
    const txt = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '14px', color })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: txt,
      y: y - 34,
      alpha: 0,
      duration: 600,
      onComplete: () => txt.destroy(),
    });
  }

  private flashScreen(color: number, ms: number): void {
    const cam = this.cameras.main;
    cam.flash(ms, ((color >> 16) & 0xff), ((color >> 8) & 0xff), (color & 0xff), 0.25);
  }

  // ==================== НАВЫКИ ====================

  private openLevelUp(): void {
    this.paused_ = true;
    this.physics.pause();
    SFX.levelUp();
    const choices = rollSkillChoices(this.ownedSkills, this.elementsInBuild, 3);
    this.events.emit('ui:levelup', { level: this.level, choices });
  }

  /** UIScene вызывает после выбора карточки ('__skip__' = пропуск). */
  applySkill = (skillId: string): void => {
    const def = getSkill(skillId);
    if (def) this.addSkillToBuild(skillId);
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    if (this.pendingLevels > 0) {
      this.openLevelUp();
    } else {
      this.paused_ = false;
      if (!this.gameOver) this.physics.resume();
      this.events.emit('ui:close-levelup');
    }
    this.emitHud();
  };

  private addSkillToBuild(id: string): void {
    const def = getSkill(id);
    if (!def) return;
    const lvl = (this.ownedSkills.get(id) ?? 0) + 1;
    this.ownedSkills.set(id, Math.min(lvl, def.maxLevel));
    this.elementsInBuild.add(def.element);

    // Комбо выключает базовое оружие-предшественник (оно «переродилось»)
    if (def.kind === 'combo' && def.isUpgradeOf) {
      this.ownedSkills.delete(def.isUpgradeOf);
      this.weaponTimers.delete(def.isUpgradeOf);
    }
    if (def.kind === 'weapon' || def.kind === 'combo') {
      this.weaponTimers.set(id, 0.2); // быстрый первый выстрел
    }

    // Пересчет пассивок
    if (def.kind === 'passive') this.recalcPassives();

    // Сохраняем открытые перки в облако
    const unlocked = new Set(YandexSDK.saveData.unlockedSkills);
    unlocked.add(id);
    YandexSDK.writeSave({ unlockedSkills: [...unlocked] }).catch(() => {});
  }

  private recalcPassives(): void {
    const L = (id: string) => this.ownedSkills.get(id) ?? 0;
    this.speedMul = 1 + L('speed') * 0.12;
    this.armorMul = Math.max(0.35, 1 - L('armor') * 0.15);
    this.regenPerSec = L('regen') * 0.6;
    this.magnetMul = 1 + L('magnet') * 0.4;
    this.critChance = 0.05 + L('crit') * 0.08;
    this.cooldownMul = Math.max(0.5, 1 - L('cooldown') * 0.12);
    const hpLvl = L('hp');
    if (hpLvl > 0) {
      const newMax = GAME_BALANCE.PLAYER_BASE_HP + hpLvl * 25;
      if (newMax !== this.maxHp) {
        this.hp += newMax - this.maxHp;
        this.maxHp = newMax;
      }
      if (hpLvl === 1) this.hp = this.maxHp; // полное лечение при первом взятии
    }
  }

  // ==================== СМЕРТЬ / ВОСКРЕШЕНИЕ ====================

  private onPlayerDeath(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.hp = 0;
    SFX.death();
    YandexSDK.gameplayStop();
    this.physics.pause();
    this.spawnBurst(this.player.x, this.player.y, 0x35c9ff, 30);
    this.player.setVisible(false);
    this.playerGlow.setVisible(false);

    const stats = {
      time: this.runTime,
      kills: this.kills,
      level: this.level,
      skills: [...this.ownedSkills.entries()].map(([id, lvl]) => ({ id, lvl })),
      canRevive: !this.revivedOnce,
    };

    // Лидерборд + рекорды
    YandexSDK.submitScore(stats.time);
    const save = YandexSDK.saveData;
    const isRecord = stats.time > save.bestTime;
    YandexSDK.writeSave({
      bestTime: Math.max(save.bestTime, Math.floor(stats.time)),
      bestKills: Math.max(save.bestKills, stats.kills),
      totalRuns: save.totalRuns + 1,
    }).catch(() => {});

    this.events.emit('ui:death', { ...stats, isRecord });
  }

  /** Вызывается из UIScene после успешной rewarded-рекламы. */
  revive(): void {
    if (this.revivedOnce || !this.gameOver) return;
    this.revivedOnce = true;
    this.gameOver = false;
    this.hp = Math.floor(this.maxHp * GAME_BALANCE.REVIVE_HP_RATIO);
    this.player.setVisible(true);
    this.playerGlow.setVisible(true);
    this.physics.resume();
    YandexSDK.gameplayStart();
    // Расчистка площади от врагов — «взрыв печати возрождения»
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemySprite;
      if (!e.active) return;
      if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 260) {
        this.damageEnemy(e, 9999, false);
      }
    });
    this.spawnRing(this.player.x, this.player.y, 260, 0xaef3ff);
    this.flashScreen(0x35c9ff, 200);
    this.invulnUntil = this.runTime + 1.5;
    this.emitHud();
  }

  shutdownCleanup(): void {
    this.offFocus?.();
    this.events.off('resume-request', this.resumeGame, this);
    this.events.off('skill-picked', this.applySkill, this);
    this.scale.off('resize', this.onResizeHandler);
  }

  override shutdown(): void {
    this.shutdownCleanup();
  }
}
