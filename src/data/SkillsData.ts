// ============================================================
// Данные навыков: стихийные атаки, комбо-синергии, пассивки.
// Огонь + Ветер = Торнадо и т.д.
// ============================================================

export type Element = 'fire' | 'water' | 'wind' | 'lightning' | 'earth' | 'neutral';

export const ELEMENT_COLORS: Record<Element, number> = {
  fire: 0xff5a1e,
  water: 0x1e90ff,
  wind: 0x7dffc8,
  lightning: 0xf8f24a,
  earth: 0xc98b4e,
  neutral: 0x9fd6ff,
};

export type SkillKind = 'weapon' | 'combo' | 'passive';

export interface SkillDef {
  id: string;
  kind: SkillKind;
  element: Element;
  /** Для combo: из каких элементов рождается скилл. */
  requires?: [Element, Element];
  /** Название требует ли апгрейд существующего скилла (weapon-lvl-up). */
  isUpgradeOf?: string;
  maxLevel: number;
  nameKey: string;
  descKey: string;
  icon: string; // имя процедурной текстуры из BootScene
  baseCooldown: number; // сек (для weapons)
  baseDamage: number;
}

/** Активные стихийные оружия (выбираются как "новые"). */
export const WEAPON_SKILLS: SkillDef[] = [
  {
    id: 'kunai',
    kind: 'weapon',
    element: 'neutral',
    maxLevel: 6,
    nameKey: 'sk_kunai_name',
    descKey: 'sk_kunai_desc',
    icon: 'icon_kunai',
    baseCooldown: 1.1,
    baseDamage: 12,
  },
  {
    id: 'fireball',
    kind: 'weapon',
    element: 'fire',
    maxLevel: 6,
    nameKey: 'sk_fireball_name',
    descKey: 'sk_fireball_desc',
    icon: 'icon_fireball',
    baseCooldown: 2.6,
    baseDamage: 20,
  },
  {
    id: 'waterlance',
    kind: 'weapon',
    element: 'water',
    maxLevel: 6,
    nameKey: 'sk_waterlance_name',
    descKey: 'sk_waterlance_desc',
    icon: 'icon_waterlance',
    baseCooldown: 3.0,
    baseDamage: 16,
  },
  {
    id: 'windblade',
    kind: 'weapon',
    element: 'wind',
    maxLevel: 6,
    nameKey: 'sk_windblade_name',
    descKey: 'sk_windblade_desc',
    icon: 'icon_windblade',
    baseCooldown: 0.45,
    baseDamage: 8,
  },
  {
    id: 'lightning',
    kind: 'weapon',
    element: 'lightning',
    maxLevel: 6,
    nameKey: 'sk_lightning_name',
    descKey: 'sk_lightning_desc',
    icon: 'icon_lightning',
    baseCooldown: 2.2,
    baseDamage: 24,
  },
  {
    id: 'rockspike',
    kind: 'weapon',
    element: 'earth',
    maxLevel: 6,
    nameKey: 'sk_rockspike_name',
    descKey: 'sk_rockspike_desc',
    icon: 'icon_rockspike',
    baseCooldown: 3.4,
    baseDamage: 18,
  },
];

/** Комбо: требуются два элемента в билде игрока. Заменяют/усиливают. */
export const COMBO_SKILLS: SkillDef[] = [
  {
    id: 'tornado',
    kind: 'combo',
    element: 'fire',
    requires: ['fire', 'wind'],
    isUpgradeOf: 'fireball',
    maxLevel: 3,
    nameKey: 'sk_tornado_name',
    descKey: 'sk_tornado_desc',
    icon: 'icon_tornado',
    baseCooldown: 2.2,
    baseDamage: 34,
  },
  {
    id: 'steamnova',
    kind: 'combo',
    element: 'water',
    requires: ['fire', 'water'],
    isUpgradeOf: 'waterlance',
    maxLevel: 3,
    nameKey: 'sk_steamnova_name',
    descKey: 'sk_steamnova_desc',
    icon: 'icon_steamnova',
    baseCooldown: 4.0,
    baseDamage: 30,
  },
  {
    id: 'plasma',
    kind: 'combo',
    element: 'lightning',
    requires: ['lightning', 'wind'],
    isUpgradeOf: 'lightning',
    maxLevel: 3,
    nameKey: 'sk_plasma_name',
    descKey: 'sk_plasma_desc',
    icon: 'icon_plasma',
    baseCooldown: 1.6,
    baseDamage: 40,
  },
  {
    id: 'magma',
    kind: 'combo',
    element: 'earth',
    requires: ['fire', 'earth'],
    isUpgradeOf: 'rockspike',
    maxLevel: 3,
    nameKey: 'sk_magma_name',
    descKey: 'sk_magma_desc',
    icon: 'icon_magma',
    baseCooldown: 3.0,
    baseDamage: 26,
  },
  {
    id: 'stormcall',
    kind: 'combo',
    element: 'water',
    requires: ['lightning', 'water'],
    isUpgradeOf: 'waterlance',
    maxLevel: 3,
    nameKey: 'sk_stormcall_name',
    descKey: 'sk_stormcall_desc',
    icon: 'icon_storm',
    baseCooldown: 3.2,
    baseDamage: 36,
  },
];

/** Пассивные улучшения. */
export const PASSIVE_SKILLS: SkillDef[] = [
  { id: 'speed', kind: 'passive', element: 'wind', maxLevel: 5, nameKey: 'sk_speed_name', descKey: 'sk_speed_desc', icon: 'icon_speed', baseCooldown: 0, baseDamage: 0 },
  { id: 'hp', kind: 'passive', element: 'earth', maxLevel: 5, nameKey: 'sk_hp_name', descKey: 'sk_hp_desc', icon: 'icon_hp', baseCooldown: 0, baseDamage: 0 },
  { id: 'magnet', kind: 'passive', element: 'neutral', maxLevel: 4, nameKey: 'sk_magnet_name', descKey: 'sk_magnet_desc', icon: 'icon_magnet', baseCooldown: 0, baseDamage: 0 },
  { id: 'armor', kind: 'passive', element: 'earth', maxLevel: 4, nameKey: 'sk_armor_name', descKey: 'sk_armor_desc', icon: 'icon_armor', baseCooldown: 0, baseDamage: 0 },
  { id: 'regen', kind: 'passive', element: 'water', maxLevel: 5, nameKey: 'sk_regen_name', descKey: 'sk_regen_desc', icon: 'icon_regen', baseCooldown: 0, baseDamage: 0 },
  { id: 'crit', kind: 'passive', element: 'lightning', maxLevel: 5, nameKey: 'sk_crit_name', descKey: 'sk_crit_desc', icon: 'icon_crit', baseCooldown: 0, baseDamage: 0 },
  { id: 'cooldown', kind: 'passive', element: 'neutral', maxLevel: 4, nameKey: 'sk_cooltd_name', descKey: 'sk_cooltd_desc', icon: 'icon_cooldown', baseCooldown: 0, baseDamage: 0 },
];

export const ALL_SKILLS: SkillDef[] = [...WEAPON_SKILLS, ...COMBO_SKILLS, ...PASSIVE_SKILLS];

const BY_ID = new Map<string, SkillDef>(ALL_SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): SkillDef | undefined {
  return BY_ID.get(id);
}

/**
 * Формирует пул из 3 карточек для экрана Level Up.
 * @param owned карта выбранных навыков: id -> уровень
 * @param elements элементы, присутствующие в билде (для комбо-рецептов)
 */
export function rollSkillChoices(
  owned: Map<string, number>,
  elementsInBuild: Set<Element>,
  count = 3
): SkillDef[] {
  const candidates: SkillDef[] = [];

  // 1) Комбо доступны, если есть оба ингредиента и комбо еще не взято
  for (const c of COMBO_SKILLS) {
    if (owned.has(c.id)) continue;
    if (c.requires && c.requires.every((e) => elementsInBuild.has(e))) {
      candidates.push(c);
    }
  }

  // 2) Прокачка уже взятых оружий/пассивок
  for (const [id, lvl] of owned) {
    const def = BY_ID.get(id);
    if (!def) continue;
    if (lvl < def.maxLevel) candidates.push(def);
  }

  // 3) Новые оружия (до 6 активных слотов всего)
  const activeCount = [...owned.keys()].filter((id) => {
    const d = BY_ID.get(id);
    return d && (d.kind === 'weapon' || d.kind === 'combo');
  }).length;
  if (activeCount < 6) {
    for (const w of WEAPON_SKILLS) {
      if (!owned.has(w.id)) candidates.push(w);
    }
  }

  // 4) Новые пассивки
  for (const p of PASSIVE_SKILLS) {
    if (!owned.has(p.id)) candidates.push(p);
  }

  // Убрать дубликаты id
  const uniq = new Map<string, SkillDef>();
  for (const c of candidates) uniq.set(c.id, c);

  // Комбо имеют приоритет (редкие и ценные) — ставим первыми в пуле
  const pool = [...uniq.values()];
  pool.sort((a, b) => (a.kind === 'combo' ? -1 : 0) - (b.kind === 'combo' ? -1 : 0));

  const picked: SkillDef[] = [];
  const copy = [...pool];
  while (picked.length < count && copy.length > 0) {
    // Первые позиции (комбо) участвуют с шансом 50%
    let idx = Math.floor(Math.random() * copy.length);
    if (copy[0]?.kind === 'combo' && Math.random() < 0.5) idx = 0;
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}
