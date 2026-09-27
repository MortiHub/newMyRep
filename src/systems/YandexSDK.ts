// ============================================================
// Yandex Games SDK v2 — обертка (strict TypeScript)
// Инициализация, локализация, сохранения, реклама,
// лидерборды, GameplayAPI, слежение за фокусом вкладки.
// ============================================================

/* Глобальный объект SDK объявлен Яндексом как window.YaGames */
declare global {
  interface Window {
    YaGames?: {
      init: () => Promise<YaGamesInstance>;
    };
  }
}

export interface YaReviewPromptOptions {
  userMode?: 'light' | 'medium' | 'heavy';
}

/** Минимальные типы SDK (то, что реально используется). */
interface YaGamesInstance {
  environment: {
    appinfo?: { url?: string };
    i18n: { lang: string; ttl: number };
    deviceInfo?: { platform?: { type?: string } };
    cluster?: unknown;
  };
  features?: {
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
  };
  getPlayer: () => Promise<YaPlayer>;
  getLeaderboards: () => Promise<YaLeaderboards>;
  adv: {
    showRewardedVideo: (options: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: () => void;
        onError?: () => void;
      };
      placement?: string;
    }) => void;
    showFullscreenAdv?: (options?: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: () => void;
        onError?: () => void;
      };
    }) => void;
  };
}

interface YaPlayer {
  getData: () => Promise<Record<string, unknown>>;
  setData: (
    data: Record<string, unknown>,
    flush?: boolean
  ) => Promise<void>;
}

interface YaLeaderboards {
  setLeaderboardScore: (
    leaderboardId: string,
    score: number
  ) => Promise<unknown>;
  getLeaderboards?: (lang?: string) => Promise<unknown>;
}

export type FocusListener = (hasFocus: boolean) => void;

const SAVE_KEY = 'chakra_survivor_save';
const LEADERBOARD_ID = 'survival_time';

/** Данные, сохраняемые в облако игрока. */
export interface SaveData {
  bestTime: number; // рекорд выживания, сек
  bestKills: number; // рекорд убийств
  totalRuns: number; // всего забегов
  unlockedSkills: string[]; // id когда-либо выбранных навыков
}

const DEFAULT_SAVE: SaveData = {
  bestTime: 0,
  bestKills: 0,
  totalRuns: 0,
  unlockedSkills: [],
};

class YandexSDKBridge {
  private sdk: YaGamesInstance | null = null;
  private playerPromise: Promise<YaPlayer | null> | null = null;
  private leaderboardsPromise: Promise<YaLeaderboards | null> | null = null;
  private isReady = false;
  private rewardedBusy = false;
  private save: SaveData = { ...DEFAULT_SAVE };
  private focusListeners: Set<FocusListener> = new Set();

  /** true, если игра запущена внутри контейнера Яндекс Игр. */
  get isInYandex(): boolean {
    return this.isReady && !!this.sdk;
  }

  get lang(): string {
    if (!this.sdk) return 'ru';
    const l = this.sdk.environment.i18n.lang || 'ru';
    return l.startsWith('tr') ? 'tr' : l.startsWith('en') ? 'en' : 'ru';
  }

  get saveData(): SaveData {
    return this.save;
  }

  /**
   * Инициализация SDK. Никогда не «роняет» игру: при отсутствии SDK
   * (локальная разработка) работает в fallback-режиме с localStorage.
   */
  async init(): Promise<void> {
    // Тай-брейкер: если SDK/сеть зависли — не держим экран загрузки дольше 6 сек.
    const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([
        p.catch(() => null),
        new Promise<null>((res) => setTimeout(() => res(null), ms)),
      ]);

    try {
      if (window.YaGames) {
        const sdk = await withTimeout(window.YaGames.init(), 6000);
        if (sdk) {
          this.sdk = sdk;
          this.isReady = true;
          console.log('[YaSDK] initialized, lang =', this.lang);
        } else {
          console.warn('[YaSDK] init timed out/unavailable, dev mode');
        }
      } else {
        console.warn('[YaSDK] YaGames not found, running in dev mode');
      }
    } catch (e) {
      console.warn('[YaSDK] init failed, dev mode:', e);
    }

    // Ленивое получение игрока (согласно правилам платформы — только при необходимости)
    if (this.sdk && !this.playerPromise) {
      this.playerPromise = withTimeout(
        this.sdk.getPlayer().catch(() => null),
        5000
      );
    }

    // Загрузка сохранений
    try {
      const raw = await this.readRawSave();
      if (raw) {
        this.save = {
          bestTime: Number(raw.bestTime) || 0,
          bestKills: Number(raw.bestKills) || 0,
          totalRuns: Number(raw.totalRuns) || 0,
          unlockedSkills: Array.isArray(raw.unlockedSkills)
            ? (raw.unlockedSkills as string[])
            : [],
        };
      }
    } catch (e) {
      console.warn('[YaSDK] load save failed', e);
    }

    // LoadingAPI.ready — сообщаем платформе, что игра готова
    try {
      this.sdk?.features?.LoadingAPI?.ready();
    } catch {
      /* noop */
    }

    // Подписка на потерю/возврат фокуса вкладки
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
  }

  // ------------------------- СОХРАНЕНИЯ -------------------------

  /** Лениво получаем объект игрока (кэшируем промис). */
  private async getPlayer(): Promise<YaPlayer | null> {
    if (!this.sdk) return null;
    if (!this.playerPromise) {
      this.playerPromise = this.sdk
        .getPlayer()
        .catch(() => null);
    }
    return this.playerPromise;
  }

  private async getLeaderboards(): Promise<YaLeaderboards | null> {
    if (!this.sdk) return null;
    if (!this.leaderboardsPromise) {
      this.leaderboardsPromise = this.sdk
        .getLeaderboards()
        .catch(() => null);
    }
    return this.leaderboardsPromise;
  }

  private async readRawSave(): Promise<Record<string, unknown> | null> {
    const player = await this.getPlayer();
    if (player) {
      try {
        const data = await player.getData();
        const blob = data[SAVE_KEY];
        if (blob && typeof blob === 'object') {
          return blob as Record<string, unknown>;
        }
      } catch (e) {
        console.warn('[YaSDK] player.getData failed', e);
      }
      return null;
    }
    // dev-mode: localStorage
    try {
      const s = localStorage.getItem(SAVE_KEY);
      return s ? (JSON.parse(s) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  async writeSave(patch: Partial<SaveData>): Promise<void> {
    this.save = { ...this.save, ...patch };
    const player = await this.getPlayer();
    if (player) {
      try {
        await player.setData({ [SAVE_KEY]: this.save }, true);
        return;
      } catch (e) {
        console.warn('[YaSDK] setData failed', e);
      }
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      /* noop */
    }
  }

  // ------------------------- GAMEPLAY API -------------------------

  gameplayStart(): void {
    try {
      this.sdk?.features?.GameplayAPI?.start();
    } catch {
      /* noop */
    }
  }

  gameplayStop(): void {
    try {
      this.sdk?.features?.GameplayAPI?.stop();
    } catch {
      /* noop */
    }
  }

  // ------------------------- РЕКЛАМА -------------------------

  /**
   * Показ rewarded video.
   * @param onSuccess вызывается, если награда получена (onRewarded)
   *                  или в dev-режиме (автоуспех).
   * @param onFail    вызывается при ошибке/закрытии без награды.
   */
  showAd(onSuccess: () => void, onFail?: () => void): void {
    if (this.rewardedBusy) {
      onFail?.();
      return;
    }
    // Dev-режим без SDK: мгновенный успех для отладки
    if (!this.sdk || !this.sdk.adv) {
      onSuccess();
      return;
    }
    this.rewardedBusy = true;
    let rewarded = false;
    try {
      this.sdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => {
            this.gameplayStop();
          },
          onRewarded: () => {
            rewarded = true;
          },
          onClose: () => {
            this.rewardedBusy = false;
            if (rewarded) onSuccess();
            else onFail?.();
          },
          onError: () => {
            this.rewardedBusy = false;
            onFail?.();
          },
        },
      });
    } catch (e) {
      console.warn('[YaSDK] showRewardedVideo error', e);
      this.rewardedBusy = false;
      onFail?.();
    }
  }

  /** Опциональная полноэкранная реклама (например, между забегами). */
  showFullscreen(onClose?: () => void): void {
    if (!this.sdk || !this.sdk.adv?.showFullscreenAdv) {
      onClose?.();
      return;
    }
    try {
      this.sdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => this.gameplayStop(),
          onClose: () => onClose?.(),
          onError: () => onClose?.(),
        },
      });
    } catch {
      onClose?.();
    }
  }

  // ------------------------- ЛИДЕРБОРДЫ -------------------------

  /** Отправка времени выживания (сек) в лидерборд survival_time. */
  submitScore(scoreSeconds: number): void {
    const score = Math.floor(scoreSeconds);
    if (score <= 0) return;
    this.getLeaderboards()
      .then((lb) => {
        if (!lb) return;
        return lb
          .setLeaderboardScore(LEADERBOARD_ID, score)
          .catch((e: unknown) =>
            console.warn('[YaSDK] lb setScore failed', e)
          );
      })
      .catch(() => undefined);
  }

  // ------------------------- ФОКУС ВКЛАДКИ -------------------------

  onLostFocus(listener: FocusListener): () => void {
    this.focusListeners.add(listener);
    return () => this.focusListeners.delete(listener);
  }

  private emitFocus(has: boolean): void {
    this.focusListeners.forEach((fn) => fn(has));
  }

  private onVisibilityChange = (): void => {
    this.emitFocus(!document.hidden);
  };
  private onBlur = (): void => this.emitFocus(false);
  private onFocus = (): void => this.emitFocus(true);
}

/** Единый экземпляр для всей игры. */
export const YandexSDK = new YandexSDKBridge();
