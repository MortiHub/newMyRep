// ============================================================
// Виртуальный экранный джойстик. Работает и мышью, и тачем.
// Рендерится собственным Graphics-объектом (без ассетов).
// Возвращает нормализованный вектор движения (-1..1).
// ============================================================
import Phaser from 'phaser';

export class InputManager {
  /** Нормализованное направление: x,y в [-1..1], magnitude <= 1. */
  readonly pointer = new Phaser.Math.Vector2(0, 0);

  private scene: Phaser.Scene;
  private activePointerId = -1;
  private originPos = new Phaser.Math.Vector2();
  private knobPos = new Phaser.Math.Vector2();
  private readonly radius = 70;
  private graphics: Phaser.GameObjects.Graphics;
  private keyboardCursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyboardWasD: Phaser.Input.Keyboard.KeyConnection;
  private keyboardCursorKeys: Phaser.Input.Keyboard.KeyConnection[] = [];
  private destroyed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1000);
    this.graphics.setScrollFactor(0);

    // Клавиатура как fallback для десктоп-отладки
    const kb = scene.input.keyboard;
    if (kb) {
      this.keyboardCursors = kb.createCursorKeys();
      this.keyboardWasD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyboardCursorKeys = [
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      ];
    }

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.events.once('shutdown', this.dispose, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.activePointerId !== -1) return;
    // Джойстик активируется любой точкой экрана (кроме UI-кнопок,
    // которые перехватывают событие через setInteractive stopPropagation)
    this.activePointerId = p.id;
    this.originPos.set(p.x, p.y);
    this.knobPos.set(p.x, p.y);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.activePointerId) return;
    const dx = p.x - this.originPos.x;
    const dy = p.y - this.originPos.y;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) {
      this.knobPos.set(
        this.originPos.x + (dx / len) * this.radius,
        this.originPos.y + (dy / len) * this.radius
      );
      this.pointer.set(dx / len, dy / len);
    } else if (len > 4) {
      this.knobPos.set(p.x, p.y);
      this.pointer.set(dx / this.radius, dy / this.radius);
    } else {
      this.pointer.set(0, 0);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.activePointerId) return;
    this.activePointerId = -1;
    this.pointer.set(0, 0);
  }

  /** Вызывать из update() сцены. Учитывает и джойстик, и клавиатуру. */
  update(): void {
    let kx = 0;
    let ky = 0;
    if (this.keyboardCursors) {
      const keyA = this.keyboardCursorKeys[0];
      const keyD = this.keyboardCursorKeys[1];
      const keyS = this.keyboardCursorKeys[2];
      if (this.keyboardCursors.left.isDown || keyA?.isDown) kx -= 1;
      if (this.keyboardCursors.right.isDown || keyD?.isDown) kx += 1;
      if (this.keyboardCursors.up.isDown || this.keyboardWasD?.isDown) ky -= 1;
      if (this.keyboardCursors.down.isDown || keyS?.isDown) ky += 1;
    }

    const useJoy = this.pointer.lengthSq() > 0.0001;
    if (useJoy) {
      this.draw(this.originPos.x, this.originPos.y, this.knobPos.x, this.knobPos.y);
    } else {
      this.graphics.clear();
      if (kx !== 0 || ky !== 0) {
        const l = Math.hypot(kx, ky) || 1;
        this.pointer.set(kx / l, ky / l);
      } else {
        this.pointer.set(0, 0);
      }
    }
  }

  private draw(ox: number, oy: number, kx: number, ky: number): void {
    const g = this.graphics;
    g.clear();
    // База
    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(ox, oy, this.radius);
    g.lineStyle(3, 0x35c9ff, 0.5);
    g.strokeCircle(ox, oy, this.radius);
    // Ручка
    g.fillStyle(0x35c9ff, 0.35);
    g.fillCircle(kx, ky, 30);
    g.lineStyle(2, 0xaef3ff, 0.9);
    g.strokeCircle(kx, ky, 30);
  }

  dispose(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const s = this.scene;
    if (s && s.input) {
      s.input.off('pointerdown', this.onDown, this);
      s.input.off('pointermove', this.onMove, this);
      s.input.off('pointerup', this.onUp, this);
    }
    this.graphics.destroy();
  }
}
