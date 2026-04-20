import { getJSON, setJSON } from './storage';

const STORAGE_KEY = 'voidHopper_achievements';

const ACHIEVEMENTS = [
  { id: 'first_flight', name: 'First Flight', desc: 'Complete your first game', icon: '🐣', check: (s) => s.gamesPlayed >= 1 },
  { id: 'sky_high', name: 'Sky High', desc: 'Reach 500m', icon: '☁️', check: (s) => s.bestDistance >= 500 },
  { id: 'stratosphere', name: 'Stratosphere', desc: 'Reach 2000m', icon: '🌤', check: (s) => s.bestDistance >= 2000 },
  { id: 'space_cadet', name: 'Space Cadet', desc: 'Reach 5000m', icon: '🚀', check: (s) => s.bestDistance >= 5000 },
  { id: 'orbit', name: 'Orbit Achieved', desc: 'Reach 10000m', icon: '🌍', check: (s) => s.bestDistance >= 10000 },
  { id: 'coin_collector', name: 'Coin Collector', desc: 'Collect 100 total coins', icon: '💰', check: (s) => s.totalCoins >= 100 },
  { id: 'coin_hoarder', name: 'Coin Hoarder', desc: 'Collect 1000 total coins', icon: '🏦', check: (s) => s.totalCoins >= 1000 },
  { id: 'combo_starter', name: 'Combo Starter', desc: 'Get a 5x combo', icon: '⚡', check: (s) => s.bestCombo >= 5 },
  { id: 'combo_master', name: 'Combo Master', desc: 'Get a 15x combo', icon: '🔥', check: (s) => s.bestCombo >= 15 },
  { id: 'guardian_slayer', name: 'Guardian Slayer', desc: 'Defeat 5 guardians total', icon: '⚔️', check: (s) => s.guardiansDefeated >= 5 },
  { id: 'daredevil', name: 'Daredevil', desc: '20 near-misses total', icon: '💨', check: (s) => s.nearMisses >= 20 },
  { id: 'bouncy', name: 'Bouncy Bird', desc: '500 wall bounces total', icon: '🏀', check: (s) => s.wallBounces >= 500 },
  { id: 'fever', name: 'Fever Pitch', desc: 'Trigger fever mode', icon: '🌟', check: (s) => s.feversTriggered >= 1 },
  { id: 'survivor', name: 'Survivor', desc: 'Use a revive', icon: '💚', check: (s) => s.revivesUsed >= 1 },
  { id: 'dedicated', name: 'Dedicated', desc: 'Play 50 games', icon: '🎮', check: (s) => s.gamesPlayed >= 50 },
  { id: 'veteran', name: 'Veteran', desc: 'Play 200 games', icon: '🏆', check: (s) => s.gamesPlayed >= 200 },
];

class AchievementManager {
  constructor() {
    this.unlocked = getJSON(STORAGE_KEY, []);
    this.stats = getJSON('voidHopper_achieveStats', {
      gamesPlayed: 0,
      bestDistance: 0,
      totalCoins: 0,
      bestCombo: 0,
      guardiansDefeated: 0,
      nearMisses: 0,
      wallBounces: 0,
      feversTriggered: 0,
      revivesUsed: 0,
    });
    this.pendingToasts = [];
  }

  _save() {
    setJSON(STORAGE_KEY, this.unlocked);
    setJSON('voidHopper_achieveStats', this.stats);
  }

  updateStats(partial) {
    for (const key of Object.keys(partial)) {
      if (key === 'bestDistance' || key === 'bestCombo') {
        this.stats[key] = Math.max(this.stats[key] || 0, partial[key]);
      } else {
        this.stats[key] = (this.stats[key] || 0) + (partial[key] || 0);
      }
    }
    this._checkAll();
    this._save();
  }

  _checkAll() {
    for (const a of ACHIEVEMENTS) {
      if (!this.unlocked.includes(a.id) && a.check(this.stats)) {
        this.unlocked.push(a.id);
        this.pendingToasts.push(a);
      }
    }
  }

  isUnlocked(id) {
    return this.unlocked.includes(id);
  }

  getAll() {
    return ACHIEVEMENTS;
  }

  getUnlockedCount() {
    return this.unlocked.length;
  }

  getTotalCount() {
    return ACHIEVEMENTS.length;
  }

  popToast() {
    return this.pendingToasts.shift() || null;
  }
}

export default AchievementManager;
