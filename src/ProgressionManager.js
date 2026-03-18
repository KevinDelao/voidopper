import { getItem, setItem } from './storage';

const MISSION_POOL = [
  { id: 'd200', type: 'distance', target: 200, desc: 'Climb 200m', reward: 5, tier: 0 },
  { id: 'c5', type: 'coins', target: 5, desc: 'Collect 5 coins', reward: 3, tier: 0 },
  { id: 'b15', type: 'bounces', target: 15, desc: 'Bounce 15 times', reward: 4, tier: 0 },
  { id: 'd500', type: 'distance', target: 500, desc: 'Climb 500m', reward: 8, tier: 1 },
  { id: 'c15', type: 'coins', target: 15, desc: 'Collect 15 coins', reward: 6, tier: 1 },
  { id: 'x5', type: 'combo', target: 5, desc: 'Reach 5x combo', reward: 8, tier: 1 },
  { id: 'nm3', type: 'nearMiss', target: 3, desc: 'Near-miss 3 enemies', reward: 8, tier: 1 },
  { id: 'b30', type: 'bounces', target: 30, desc: 'Bounce 30 times', reward: 6, tier: 1 },
  { id: 'd1k', type: 'distance', target: 1000, desc: 'Climb 1,000m', reward: 12, tier: 2 },
  { id: 'c30', type: 'coins', target: 30, desc: 'Collect 30 coins', reward: 10, tier: 2 },
  { id: 'x10', type: 'combo', target: 10, desc: 'Reach 10x combo', reward: 15, tier: 2 },
  { id: 'fire', type: 'onfire', target: 1, desc: 'Reach ON FIRE mood', reward: 10, tier: 2 },
  { id: 'b50', type: 'bounces', target: 50, desc: 'Bounce 50 times', reward: 8, tier: 2 },
  { id: 'd2k', type: 'distance', target: 2000, desc: 'Climb 2,000m', reward: 20, tier: 3 },
  { id: 'c50', type: 'coins', target: 50, desc: 'Collect 50 coins', reward: 18, tier: 3 },
  { id: 'x15', type: 'combo', target: 15, desc: 'Reach UNSTOPPABLE', reward: 25, tier: 3 },
  { id: 'g1', type: 'guardian', target: 1, desc: 'Survive a Guardian', reward: 15, tier: 3 },
  { id: 'nm8', type: 'nearMiss', target: 8, desc: 'Near-miss 8 enemies', reward: 18, tier: 3 },
];

// Cumulative lifetime missions (persist across runs)
const CUMULATIVE_MISSIONS = [
  { id: 'lt_c500', type: 'lt_coins', target: 500, desc: 'Collect 500 lifetime coins', reward: 30 },
  { id: 'lt_c2000', type: 'lt_coins', target: 2000, desc: 'Collect 2,000 lifetime coins', reward: 75 },
  { id: 'lt_b1000', type: 'lt_bounces', target: 1000, desc: 'Bounce 1,000 times total', reward: 40 },
  { id: 'lt_d50k', type: 'lt_distance', target: 50000, desc: 'Climb 50,000m total', reward: 50 },
  { id: 'lt_g10', type: 'lt_guardians', target: 10, desc: 'Defeat 10 guardians', reward: 60 },
  { id: 'lt_nm50', type: 'lt_nearMisses', target: 50, desc: '50 near-misses total', reward: 35 },
  { id: 'lt_g50', type: 'lt_games', target: 50, desc: 'Play 50 games', reward: 50 },
  { id: 'lt_g200', type: 'lt_games', target: 200, desc: 'Play 200 games', reward: 100 },
  { id: 'lt_fire10', type: 'lt_onfire', target: 10, desc: 'Reach ON FIRE 10 times', reward: 45 },
  { id: 'lt_x10', type: 'lt_maxCombo', target: 10, desc: 'Reach 10x combo in 10 games', reward: 55 },
  { id: 'lt_c5000', type: 'lt_coins', target: 5000, desc: 'Collect 5,000 lifetime coins', reward: 150 },
  { id: 'lt_d200k', type: 'lt_distance', target: 200000, desc: 'Climb 200,000m total', reward: 120 },
];

// Daily challenge templates
const DAILY_CHALLENGES = [
  { type: 'distance', target: 1000, desc: 'Climb 1,000m in a single run', reward: 30 },
  { type: 'coins', target: 20, desc: 'Collect 20 coins in a single run', reward: 25 },
  { type: 'combo', target: 8, desc: 'Reach 8x combo', reward: 30 },
  { type: 'nearMiss', target: 5, desc: 'Near-miss 5 enemies in one run', reward: 30 },
  { type: 'bounces', target: 40, desc: 'Bounce 40 times in one run', reward: 25 },
  { type: 'guardian', target: 2, desc: 'Survive 2 guardians in one run', reward: 35 },
  { type: 'distance', target: 500, desc: 'Climb 500m without a shield', reward: 35 },
];

class ProgressionManager {
  constructor() {
    this._load();
  }

  _load() {
    let data = {};
    try {
      const raw = getItem('voidHopper_progression');
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    this.completedCount = data.completedCount || 0;
    this.completedIds = new Set(data.completedIds || []);
    this.missions = data.missions || [];
    this.streak = data.streak || 0;
    this.lastPlayDate = data.lastPlayDate || '';
    // Lifetime stats for cumulative missions
    this.lifetimeStats = data.lifetimeStats || {
      coins: 0, bounces: 0, distance: 0, guardians: 0,
      nearMisses: 0, games: 0, onfire: 0, maxCombo: 0,
    };
    this.completedCumulativeIds = new Set(data.completedCumulativeIds || []);
    // Player level / XP
    this.xp = data.xp || 0;
    this.level = data.level || 1;
    // Daily login reward
    this.lastDailyClaimDate = data.lastDailyClaimDate || '';
    this.dailyLoginDay = data.dailyLoginDay || 0;
    this.pendingDailyReward = 0;
    // Daily challenge
    this.dailyChallenge = data.dailyChallenge || null;
    this.dailyChallengeDate = data.dailyChallengeDate || '';

    this._updateStreak();
    this._checkDailyLogin();
    this._checkDailyChallenge();
    while (this.missions.length < 3) this._addNewMission();
    this._save();
  }

  _save() {
    try {
      setItem('voidHopper_progression', JSON.stringify({
        completedCount: this.completedCount,
        completedIds: [...this.completedIds],
        missions: this.missions,
        streak: this.streak,
        lastPlayDate: this.lastPlayDate,
        lifetimeStats: this.lifetimeStats,
        completedCumulativeIds: [...this.completedCumulativeIds],
        xp: this.xp,
        level: this.level,
        lastDailyClaimDate: this.lastDailyClaimDate,
        dailyLoginDay: this.dailyLoginDay,
        dailyChallenge: this.dailyChallenge,
        dailyChallengeDate: this.dailyChallengeDate,
      }));
    } catch {}
  }

  _updateStreak() {
    const today = new Date().toDateString();
    if (this.lastPlayDate === today) return;
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yesterday = d.toDateString();
    if (this.lastPlayDate === yesterday) {
      this.streak++;
    } else {
      this.streak = 1;
    }
    this.lastPlayDate = today;
  }

  // Daily login reward: Day 1=5, Day 2=10, Day 3=15, Day 4=20, Day 5=25, Day 6=35, Day 7=50
  _checkDailyLogin() {
    const today = new Date().toDateString();
    if (this.lastDailyClaimDate === today) {
      this.pendingDailyReward = 0;
      return;
    }
    const rewards = [5, 10, 15, 20, 25, 35, 50];
    this.pendingDailyReward = rewards[this.dailyLoginDay % 7];
  }

  claimDailyReward() {
    if (this.pendingDailyReward <= 0) return 0;
    const reward = this.pendingDailyReward;
    this.lastDailyClaimDate = new Date().toDateString();
    this.dailyLoginDay = (this.dailyLoginDay + 1) % 7;
    this.pendingDailyReward = 0;
    this.addXP(reward);
    this._save();
    return reward;
  }

  getDailyRewardInfo() {
    const rewards = [5, 10, 15, 20, 25, 35, 50];
    return {
      pending: this.pendingDailyReward,
      day: (this.dailyLoginDay % 7) + 1,
      rewards,
    };
  }

  // Daily challenge: one special mission per day
  _checkDailyChallenge() {
    const today = new Date().toDateString();
    if (this.dailyChallengeDate === today && this.dailyChallenge) return;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const challengeIdx = dayOfYear % DAILY_CHALLENGES.length;
    const template = DAILY_CHALLENGES[challengeIdx];
    this.dailyChallenge = {
      ...template,
      progress: 0,
      completed: false,
      claimed: false,
    };
    this.dailyChallengeDate = today;
    this._save();
  }

  getDailyChallenge() { return this.dailyChallenge; }

  updateDailyChallenge(runStats) {
    if (!this.dailyChallenge || this.dailyChallenge.completed) return false;
    let current = 0;
    switch (this.dailyChallenge.type) {
      case 'distance': current = runStats.distance || 0; break;
      case 'coins': current = runStats.coins || 0; break;
      case 'combo': current = runStats.maxCombo || 0; break;
      case 'nearMiss': current = runStats.nearMisses || 0; break;
      case 'bounces': current = runStats.wallBounces || 0; break;
      case 'guardian': current = runStats.guardiansDefeated || 0; break;
      default: break;
    }
    this.dailyChallenge.progress = Math.min(current, this.dailyChallenge.target);
    if (this.dailyChallenge.progress >= this.dailyChallenge.target) {
      this.dailyChallenge.completed = true;
    }
    this._save();
    return this.dailyChallenge.completed;
  }

  claimDailyChallengeReward() {
    if (!this.dailyChallenge || !this.dailyChallenge.completed || this.dailyChallenge.claimed) return 0;
    this.dailyChallenge.claimed = true;
    this.addXP(this.dailyChallenge.reward * 2);
    this._save();
    return this.dailyChallenge.reward;
  }

  // Player level / XP system
  getXPForLevel(lvl) { return Math.floor(50 * Math.pow(1.3, lvl - 1)); }

  addXP(amount) {
    this.xp += amount;
    let needed = this.getXPForLevel(this.level);
    while (this.xp >= needed) {
      this.xp -= needed;
      this.level++;
      needed = this.getXPForLevel(this.level);
    }
    this._save();
  }

  getLevel() { return this.level; }
  getXP() { return this.xp; }
  getXPProgress() { return this.xp / this.getXPForLevel(this.level); }

  // Cumulative lifetime missions
  updateLifetimeStats(runStats) {
    this.lifetimeStats.coins += runStats.coins || 0;
    this.lifetimeStats.bounces += runStats.wallBounces || 0;
    this.lifetimeStats.distance += runStats.distance || 0;
    this.lifetimeStats.guardians += runStats.guardiansDefeated || 0;
    this.lifetimeStats.nearMisses += runStats.nearMisses || 0;
    this.lifetimeStats.games++;
    if (runStats.reachedOnFire) this.lifetimeStats.onfire++;
    if ((runStats.maxCombo || 0) >= 10) this.lifetimeStats.maxCombo++;
    this._save();
  }

  collectCumulativeRewards() {
    let total = 0;
    for (const cm of CUMULATIVE_MISSIONS) {
      if (this.completedCumulativeIds.has(cm.id)) continue;
      let current = 0;
      switch (cm.type) {
        case 'lt_coins': current = this.lifetimeStats.coins; break;
        case 'lt_bounces': current = this.lifetimeStats.bounces; break;
        case 'lt_distance': current = this.lifetimeStats.distance; break;
        case 'lt_guardians': current = this.lifetimeStats.guardians; break;
        case 'lt_nearMisses': current = this.lifetimeStats.nearMisses; break;
        case 'lt_games': current = this.lifetimeStats.games; break;
        case 'lt_onfire': current = this.lifetimeStats.onfire; break;
        case 'lt_maxCombo': current = this.lifetimeStats.maxCombo; break;
        default: break;
      }
      if (current >= cm.target) {
        this.completedCumulativeIds.add(cm.id);
        total += cm.reward;
        this.addXP(cm.reward * 3);
      }
    }
    this._save();
    return total;
  }

  getCumulativeMissions() {
    return CUMULATIVE_MISSIONS.map(cm => {
      let current = 0;
      switch (cm.type) {
        case 'lt_coins': current = this.lifetimeStats.coins; break;
        case 'lt_bounces': current = this.lifetimeStats.bounces; break;
        case 'lt_distance': current = this.lifetimeStats.distance; break;
        case 'lt_guardians': current = this.lifetimeStats.guardians; break;
        case 'lt_nearMisses': current = this.lifetimeStats.nearMisses; break;
        case 'lt_games': current = this.lifetimeStats.games; break;
        case 'lt_onfire': current = this.lifetimeStats.onfire; break;
        case 'lt_maxCombo': current = this.lifetimeStats.maxCombo; break;
        default: break;
      }
      return {
        ...cm,
        progress: Math.min(current, cm.target),
        completed: this.completedCumulativeIds.has(cm.id),
      };
    });
  }

  getStreakBonus() {
    // Extended streak: up to +100% at day 10
    return Math.min(1.0, (this.streak - 1) * 0.1);
  }

  _getCurrentTier() {
    return Math.min(3, Math.floor(this.completedCount / 3));
  }

  _addNewMission() {
    const tier = this._getCurrentTier();
    const activeIds = new Set(this.missions.map(m => m.id));
    let eligible = MISSION_POOL.filter(m => m.tier <= tier && !activeIds.has(m.id));
    if (eligible.length === 0) {
      eligible = MISSION_POOL.filter(m => !activeIds.has(m.id));
    }
    if (eligible.length === 0) return;
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    this.missions.push({
      id: pick.id, type: pick.type, target: pick.target,
      desc: pick.desc, reward: pick.reward, tier: pick.tier,
      progress: 0, completed: false,
    });
  }

  updateProgress(runStats) {
    let anyCompleted = false;
    this.missions.forEach(m => {
      if (m.completed) return;
      let current = 0;
      switch (m.type) {
        case 'distance': current = runStats.distance || 0; break;
        case 'coins': current = runStats.coins || 0; break;
        case 'combo': current = runStats.maxCombo || 0; break;
        case 'nearMiss': current = runStats.nearMisses || 0; break;
        case 'bounces': current = runStats.wallBounces || 0; break;
        case 'guardian': current = runStats.guardiansDefeated || 0; break;
        case 'onfire': current = runStats.reachedOnFire ? 1 : 0; break;
        default: break;
      }
      m.progress = Math.min(current, m.target);
      if (m.progress >= m.target) {
        m.completed = true;
        anyCompleted = true;
      }
    });
    this._save();
    return anyCompleted;
  }

  collectRewards() {
    let total = 0;
    this.missions.filter(m => m.completed).forEach(m => {
      total += m.reward;
      this.completedCount++;
      this.completedIds.add(m.id);
    });
    this.missions = this.missions.filter(m => !m.completed);
    while (this.missions.length < 3) this._addNewMission();
    this._save();
    return total;
  }

  getMissions() { return this.missions; }
  getStreak() { return this.streak; }
}

export default ProgressionManager;
