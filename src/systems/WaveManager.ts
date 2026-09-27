// ============================================================
// WaveManager — логика спавна волн с нарастающей сложностью.
// Не знает о Phaser-объектах напрямую: получает колбэки
// spawnEnemy(type, x, y) от GameScene.
// ============================================================
import { GAME_BALANCE } from '../config/GameConfig';

export type EnemyType = 'grunt' | 'runner' | 'tank' | 'miniboss';

export interface SpawnRequest {
  type: EnemyType;
  x: number;
  y: number;
}

interface WaveParams {
  /** врагов в секунду */
  rate: number;
  types: { type: EnemyType; weight: number }[];
}

export class WaveManager {
  private elapsed = 0;
  private spawnAccumulator = 0;
  private waveNumber = 1;
  private nextBossAt = GAME_BALANCE.MINI_BOSS_INTERVAL;
  private onSpawn: (req: SpawnRequest) => void;
  private onWaveChange: (wave: number) => void;
  private aliveCountProvider: () => number;

  constructor(
    onSpawn: (req: SpawnRequest) => void,
    onWaveChange: (wave: number) => void,
    aliveCountProvider: () => number
  ) {
    this.onSpawn = onSpawn;
    this.onWaveChange = onWaveChange;
    this.aliveCountProvider = aliveCountProvider;
  }

  get wave(): number {
    return this.waveNumber;
  }

  /** Сложность растет со временем. Каждая «волна» = 30 секунд. */
  private currentParams(): WaveParams {
    const t = this.elapsed;
    const stage = Math.floor(t / 30); // номер получасового этапа
    const rate = Math.min(45, 2.2 + stage * 0.9);

    const types: { type: EnemyType; weight: number }[] = [
      { type: 'grunt', weight: 10 },
    ];
    if (t > 45) types.push({ type: 'runner', weight: 3 + stage * 0.6 });
    if (t > 120) types.push({ type: 'tank', weight: 1.5 + stage * 0.3 });
    return { rate, types };
  }

  private pickType(types: { type: EnemyType; weight: number }[]): EnemyType {
    let total = 0;
    for (const w of types) total += w.weight;
    let r = Math.random() * total;
    for (const w of types) {
      r -= w.weight;
      if (r <= 0) return w.type;
    }
    return types[types.length - 1].type;
  }

  /**
   * Обновление. halfW/halfH — половины размеров видимой области камеры.
   * Спавнит врагов за краями экрана через колбэк onSpawn.
   */
  update(dt: number, halfW: number, halfH: number): void {
    this.elapsed += dt;

    const newWave = Math.floor(this.elapsed / 30) + 1;
    if (newWave !== this.waveNumber) {
      this.waveNumber = newWave;
      this.onWaveChange(newWave);
    }

    // Мини-босс каждые 2 минуты
    if (this.elapsed >= this.nextBossAt) {
      this.nextBossAt += GAME_BALANCE.MINI_BOSS_INTERVAL;
      const p = this.ringPosition(halfW, halfH);
      this.onSpawn({ type: 'miniboss', ...p });
    }

    // Обычные враги
    const params = this.currentParams();
    const alive = this.aliveCountProvider();
    if (alive >= GAME_BALANCE.MAX_ENEMIES_ALIVE) return;

    this.spawnAccumulator += params.rate * dt;
    const budget = Math.min(Math.floor(this.spawnAccumulator), 12);
    this.spawnAccumulator -= budget;

    for (let i = 0; i < budget; i++) {
      const pos = this.ringPosition(halfW, halfH);
      this.onSpawn({ type: this.pickType(params.types), ...pos });
    }
  }

  /** Случайная точка за пределами видимого экрана (кольцо вокруг камеры). */
  private ringPosition(halfW: number, halfH: number): { x: number; y: number } {
    const margin = 80;
    const angle = Math.random() * Math.PI * 2;
    const rx = halfW + margin;
    const ry = halfH + margin;
    // Точка на эллипсе
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    return { x, y };
  }

  reset(): void {
    this.elapsed = 0;
    this.spawnAccumulator = 0;
    this.waveNumber = 1;
    this.nextBossAt = GAME_BALANCE.MINI_BOSS_INTERVAL;
  }
}
