// ============================================================
// Словари локализации RU / EN / TR.
// Все тексты игры берутся только отсюда (t('key')).
// ============================================================

export type Lang = 'ru' | 'en' | 'tr';

const RU: Record<string, string> = {
  game_title: 'ЧАКРА-СУРВАЙВОР',
  game_subtitle: 'Ниндзя против Орды',
  play: 'ИГРАТЬ',
  best_time: 'Рекорд: {time}',
  best_kills: 'Убийств: {kills}',
  loading: 'Загрузка печатей...',
  tap_to_start: 'Нажмите, чтобы начать',

  // HUD
  level: 'Ур.',
  wave: 'Волна {n}',
  kills: 'Убийства',
  time: 'Время',

  // Level Up
  level_up: 'ПОВЫШЕНИЕ УРОВНЯ!',
  choose_skill: 'Выберите технику чакры',
  skip: 'Пропустить (+30 HP)',

  // Элементы
  elem_fire: 'Огонь',
  elem_water: 'Вода',
  elem_wind: 'Ветер',
  elem_lightning: 'Молния',
  elem_earth: 'Земля',
  elem_neutral: 'Нейтрально',

  // Навыки — названия
  sk_kunai_name: 'Кунай',
  sk_kunai_desc: 'Бросок куная в ближайшего врага. Быстрее и сильнее.',
  sk_fireball_name: 'Огненный шар',
  sk_fireball_desc: 'Шар пламени взрывается у ближайшего врага.',
  sk_waterlance_name: 'Водяное копье',
  sk_waterlance_desc: 'Струя воды пробивает врагов насквозь.',
  sk_windblade_name: 'Клиент ветра',
  sk_windblade_desc: 'Режущий ветер кружится вокруг вас.',
  sk_lightning_name: 'Разряд молнии',
  sk_lightning_desc: 'Молния бьет по случайным врагам рядом.',
  sk_rockspike_name: 'Каменные шипы',
  sk_rockspike_desc: 'Шипы земли вырастают вокруг вас и ранят.',
  // Комбо
  sk_tornado_name: 'ОГНЕННЫЙ ТОРНАДО',
  sk_tornado_desc: 'Огонь + Ветер: торнадо жжет все вокруг.',
  sk_steamnova_name: 'ПАРОВОЙ ВЗРЫВ',
  sk_steamnova_desc: 'Огонь + Вода: периодический взрыв пара.',
  sk_plasma_name: 'ПЛАЗМЕННЫЙ РАЗРЕД',
  sk_plasma_desc: 'Молния + Ветер: цепь бьет сильнее и чаще.',
  sk_magma_name: 'МАГМАТИЧЕСКИЙ ВАЛ',
  sk_magma_desc: 'Огонь + Земля: лавовые кратеры горят дольше.',
  sk_stormcall_name: 'БУРЯ ГРОЗА',
  sk_stormcall_desc: 'Молния + Вода: шторм бьет по площади.',
  // Пассивки
  sk_speed_name: 'Скорость ветра',
  sk_speed_desc: '+12% к скорости передвижения.',
  sk_hp_name: 'Тело земли',
  sk_hp_desc: '+25 макс. HP и полное лечение.',
  sk_magnet_name: 'Магнит чакры',
  sk_magnet_desc: '+40% радиуса сбора сфер чакры.',
  sk_armor_name: 'Печать брони',
  sk_armor_desc: '-15% получаемого урона.',
  sk_regendesc: '',
  sk_regen_name: 'Медицинский ниндзюцу',
  sk_regen_desc: '+0.6 HP в секунду.',
  sk_crit_name: 'Глазsharingan',
  sk_crit_desc: '+8% шанс критического удара x2.',
  sk_cooltd_name: 'Быстрые руки',
  sk_cooltd_desc: '-12% к перезарядке всех техник.',

  // Death
  you_died: 'ВЫ ПАЛИ',
  survived: 'Время выживания: {time}',
  killed: 'Убито врагов: {kills}',
  reached_level: 'Достигнут уровень: {lvl}',
  skills_taken: 'Освоенные техники:',
  revive_ad: 'ВОСКРЕСНУТЬ (реклама)',
  reward_x3_ad: 'x3 НАГРАДА (реклама)',
  retry: 'ЕЩЕ РАЗ',
  menu: 'В МЕНЮ',
  new_record: 'НОВЫЙ РЕКОРД!',
  score_sent: 'Результат отправлен в лидерборд',
  paused: 'ПАУЗА',
  resume: 'Продолжить',
  ad_error: 'Реклама недоступна',
};

const EN: Record<string, string> = {
  game_title: 'CHAKRA SURVIVOR',
  game_subtitle: 'Ninja vs The Horde',
  play: 'PLAY',
  best_time: 'Best: {time}',
  best_kills: 'Kills: {kills}',
  loading: 'Loading seals...',
  tap_to_start: 'Tap to start',

  level: 'Lv.',
  wave: 'Wave {n}',
  kills: 'Kills',
  time: 'Time',

  level_up: 'LEVEL UP!',
  choose_skill: 'Choose a chakra technique',
  skip: 'Skip (+30 HP)',

  elem_fire: 'Fire',
  elem_water: 'Water',
  elem_wind: 'Wind',
  elem_lightning: 'Lightning',
  elem_earth: 'Earth',
  elem_neutral: 'Neutral',

  sk_kunai_name: 'Kunai',
  sk_kunai_desc: 'Throws a kunai at the nearest enemy. Faster & stronger.',
  sk_fireball_name: 'Fireball',
  sk_fireball_desc: 'A fireball explodes near the closest enemy.',
  sk_waterlance_name: 'Water Lance',
  sk_waterlance_desc: 'A piercing jet of water hits in a line.',
  sk_windblade_name: 'Wind Blade',
  sk_windblade_desc: 'Cutting wind orbits around you.',
  sk_lightning_name: 'Lightning Bolt',
  sk_lightning_desc: 'Lightning strikes random nearby enemies.',
  sk_rockspike_name: 'Rock Spikes',
  sk_rockspike_desc: 'Earth spikes rise around you and damage foes.',
  sk_tornado_name: 'FIRE TORNADO',
  sk_tornado_desc: 'Fire + Wind: a burning tornado engulfs the area.',
  sk_steamnova_name: 'STEAM NOVA',
  sk_steamnova_desc: 'Fire + Water: periodic scalding steam blast.',
  sk_plasma_name: 'PLASMA DISCHARGE',
  sk_plasma_desc: 'Lightning + Wind: chain bolts hit harder & often.',
  sk_magma_name: 'MAGMA SURGE',
  sk_magma_desc: 'Fire + Earth: lava pits burn enemies longer.',
  sk_stormcall_name: 'THUNDER STORM',
  sk_stormcall_desc: 'Lightning + Water: a storm hits an area.',
  sk_speed_name: 'Wind Step',
  sk_speed_desc: '+12% movement speed.',
  sk_hp_name: 'Earthen Body',
  sk_hp_desc: '+25 max HP and full heal.',
  sk_magnet_name: 'Chakra Magnet',
  sk_magnet_desc: '+40% chakra orb pickup radius.',
  sk_armor_name: 'Armor Seal',
  sk_armor_desc: '-15% damage taken.',
  sk_regen_name: 'Medical Ninjutsu',
  sk_regen_desc: '+0.6 HP per second.',
  sk_crit_name: 'Sharingan Eye',
  sk_crit_desc: '+8% crit chance for double damage.',
  sk_cooltd_name: 'Quick Hands',
  sk_cooltd_desc: '-12% cooldown on all techniques.',

  you_died: 'YOU DIED',
  survived: 'Survived: {time}',
  killed: 'Enemies slain: {kills}',
  reached_level: 'Level reached: {lvl}',
  skills_taken: 'Techniques learned:',
  revive_ad: 'REVIVE (ad)',
  reward_x3_ad: 'x3 REWARD (ad)',
  retry: 'RETRY',
  menu: 'MENU',
  new_record: 'NEW RECORD!',
  score_sent: 'Score submitted to leaderboard',
  paused: 'PAUSED',
  resume: 'Resume',
  ad_error: 'Ad unavailable',
};

const TR: Record<string, string> = {
  game_title: 'ÇAKRA HAYATTA KALAN',
  game_subtitle: 'Ninja vs Sürü',
  play: 'OYNA',
  best_time: 'Rekor: {time}',
  best_kills: 'Öldürme: {kills}',
  loading: 'Mühürler yükleniyor...',
  tap_to_start: 'Başlamak için dokun',

  level: 'Sv.',
  wave: 'Dalga {n}',
  kills: 'Öldürme',
  time: 'Süre',

  level_up: 'SEVİYE ATLADIN!',
  choose_skill: 'Bir çakra tekniği seç',
  skip: 'Geç (+30 HP)',

  elem_fire: 'Ateş',
  elem_water: 'Su',
  elem_wind: 'Rüzgar',
  elem_lightning: 'Yıldırım',
  elem_earth: 'Toprak',
  elem_neutral: 'Nötr',

  sk_kunai_name: 'Kunai',
  sk_kunai_desc: 'En yakın düşmana kunai atar. Daha hızlı ve güçlü.',
  sk_fireball_name: 'Ateş Topu',
  sk_fireball_desc: 'Ateş topu en yakın düşmanın yanında patlar.',
  sk_waterlance_name: 'Su Mızrağı',
  sk_waterlance_desc: 'Düşmanları delip geçen su jeti.',
  sk_windblade_name: 'Rüzgar Bıçağı',
  sk_windblade_desc: 'Kesici rüzgar etrafında döner.',
  sk_lightning_name: 'Yıldırım',
  sk_lightning_desc: 'Yıldırım rastgele yakındaki düşmanlara çarpar.',
  sk_rockspike_name: 'Kaya Dikenleri',
  sk_rockspike_desc: 'Etrafında kaya dikenleri yükselir.',
  sk_tornado_name: 'ATEŞ TORNADOSU',
  sk_tornado_desc: 'Ateş + Rüzgar: yanan tornado alanı sarar.',
  sk_steamnova_name: 'BUHAR PATLAMASI',
  sk_steamnova_desc: 'Ateş + Su: periyodik buhar patlaması.',
  sk_plasma_name: 'PLAZMA DEŞARJ',
  sk_plasma_desc: 'Yıldırım + Rüzgar: zincir daha güçlü ve sık.',
  sk_magma_name: 'MAGMA DALGASI',
  sk_magma_desc: 'Ateş + Toprak: lav çukurları daha uzun yakar.',
  sk_stormcall_name: 'GÖK GÜRÜLTÜLÜ FIRTINA',
  sk_stormcall_desc: 'Yıldırım + Su: fırtına alana vurur.',
  sk_speed_name: 'Rüzgar Adımı',
  sk_speed_desc: '+%12 hareket hızı.',
  sk_hp_name: 'Toprak Beden',
  sk_hp_desc: '+25 maks HP ve tam iyileşme.',
  sk_magnet_name: 'Çakra Mıknatısı',
  sk_magnet_desc: '+%40 çakra küresi toplama yarıçapı.',
  sk_armor_name: 'Zırh Mühürü',
  sk_armor_desc: '-%15 alınan hasar.',
  sk_regen_name: 'Tıbbi Ninjutsu',
  sk_regen_desc: 'Saniyede +0.6 HP.',
  sk_crit_name: 'Sharingan Gözü',
  sk_crit_desc: '+%8 çift hasarlı kritik şansı.',
  sk_cooltd_name: 'Hızlı Eller',
  sk_cooltd_desc: 'Tüm tekniklerde -%12 bekleme süresi.',

  you_died: 'ÖLDÜN',
  survived: 'Hayatta kalma: {time}',
  killed: 'Öldürülen düşman: {kills}',
  reached_level: 'Ulaşılan seviye: {lvl}',
  skills_taken: 'Öğrenilen teknikler:',
  revive_ad: 'CANLANDIR (reklam)',
  reward_x3_ad: 'x3 ÖDÜL (reklam)',
  retry: 'TEKRAR',
  menu: 'MENÜ',
  new_record: 'YENİ REKOR!',
  score_sent: 'Skor lider tabloya gönderildi',
  paused: 'DURAKLATILDI',
  resume: 'Devam et',
  ad_error: 'Reklam yok',
};

const DICTS: Record<Lang, Record<string, string>> = { ru: RU, en: EN, tr: TR };

/** Текущий язык (ставится из YandexSDK.lang после инициализации). */
let currentLang: Lang = 'ru';

export function setLanguage(lang: string): void {
  currentLang = lang === 'en' || lang === 'tr' ? (lang as Lang) : 'ru';
}

export function getLanguage(): Lang {
  return currentLang;
}

/** Перевод ключа с подстановкой {placeholders}. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICTS[currentLang][key] ?? DICTS.ru[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replaceAll(`{${k}}`, String(params[k]));
    }
  }
  return s;
}
