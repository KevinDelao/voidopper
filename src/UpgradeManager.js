import { getJSON, setJSON } from './storage';

const STORAGE_KEY = 'voidHopper_upgrades';

const UPGRADE_DEFS = {
  launchPower: {
    name: 'Launch Power',
    desc: 'Stronger launches',
    icon: '🚀',
    maxLevel: 5,
    costs: [50, 120, 250, 500, 1000],
    effect: (lvl) => 1 + lvl * 0.06, // 6% per level
  },
  shieldDuration: {
    name: 'Shield Duration',
    desc: 'Shields last longer',
    icon: '🛡',
    maxLevel: 5,
    costs: [60, 150, 300, 600, 1200],
    effect: (lvl) => 1 + lvl * 0.25, // +25% duration per level
  },
  coinMagnet: {
    name: 'Coin Magnet',
    desc: 'Wider coin pickup',
    icon: '🧲',
    maxLevel: 5,
    costs: [40, 100, 200, 400, 800],
    effect: (lvl) => 1 + lvl * 0.15, // +15% radius per level
  },
  moodBoost: {
    name: 'Mood Boost',
    desc: 'Mood rises faster',
    icon: '🔥',
    maxLevel: 5,
    costs: [50, 120, 250, 500, 1000],
    effect: (lvl) => 1 + lvl * 0.10, // +10% mood gain per level
  },
  voidResist: {
    name: 'Void Resist',
    desc: 'Void rises slower',
    icon: '⬇',
    maxLevel: 3,
    costs: [200, 500, 1200],
    effect: (lvl) => 1 - lvl * 0.05, // 5% slower per level
  },
  coinBonus: {
    name: 'Coin Bonus',
    desc: 'Earn more coins',
    icon: '💰',
    maxLevel: 5,
    costs: [80, 200, 400, 800, 1500],
    effect: (lvl) => 1 + lvl * 0.10, // +10% coins per level
  },
};

class UpgradeManager {
  constructor() {
    this.levels = getJSON(STORAGE_KEY, {});
  }

  getLevel(key) {
    return this.levels[key] || 0;
  }

  getDef(key) {
    return UPGRADE_DEFS[key];
  }

  getAllDefs() {
    return UPGRADE_DEFS;
  }

  getEffect(key) {
    const def = UPGRADE_DEFS[key];
    if (!def) return 1;
    return def.effect(this.getLevel(key));
  }

  getCost(key) {
    const def = UPGRADE_DEFS[key];
    if (!def) return Infinity;
    const lvl = this.getLevel(key);
    if (lvl >= def.maxLevel) return null;
    return def.costs[lvl];
  }

  isMaxed(key) {
    const def = UPGRADE_DEFS[key];
    return def ? this.getLevel(key) >= def.maxLevel : true;
  }

  purchase(key, totalCoins) {
    const cost = this.getCost(key);
    if (cost == null || totalCoins < cost) return null;
    this.levels[key] = (this.levels[key] || 0) + 1;
    setJSON(STORAGE_KEY, this.levels);
    return cost;
  }

  reset() {
    this.levels = {};
    setJSON(STORAGE_KEY, {});
  }
}

export default UpgradeManager;
