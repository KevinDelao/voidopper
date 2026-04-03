import { getItem, setItem } from './storage';
import { t } from './i18n';

// Mission description key mapping by type
const MISSION_DESC_KEYS = {
  distance: 'mission.climb',
  coins: 'mission.collectCoins',
  bounces: 'mission.bounce',
  combo: 'mission.combo',
  nearMiss: 'mission.nearMiss',
  onfire: 'mission.onfire',
  guardian: 'mission.guardian',
};

const MISSION_POOL = [
  { id: 'd200', type: 'distance', target: 200, descKey: 'mission.climb', reward: 5, tier: 0 },
  { id: 'c5', type: 'coins', target: 5, descKey: 'mission.collectCoins', reward: 3, tier: 0 },
  { id: 'b15', type: 'bounces', target: 15, descKey: 'mission.bounce', reward: 4, tier: 0 },
  { id: 'd500', type: 'distance', target: 500, descKey: 'mission.climb', reward: 8, tier: 1 },
  { id: 'c15', type: 'coins', target: 15, descKey: 'mission.collectCoins', reward: 6, tier: 1 },
  { id: 'x5', type: 'combo', target: 5, descKey: 'mission.combo', reward: 8, tier: 1 },
  { id: 'nm3', type: 'nearMiss', target: 3, descKey: 'mission.nearMiss', reward: 8, tier: 1 },
  { id: 'b30', type: 'bounces', target: 30, descKey: 'mission.bounce', reward: 6, tier: 1 },
  { id: 'd1k', type: 'distance', target: 1000, descKey: 'mission.climb', reward: 12, tier: 2 },
  { id: 'c30', type: 'coins', target: 30, descKey: 'mission.collectCoins', reward: 10, tier: 2 },
  { id: 'x10', type: 'combo', target: 10, descKey: 'mission.combo', reward: 15, tier: 2 },
  { id: 'fire', type: 'onfire', target: 1, descKey: 'mission.onfire', reward: 10, tier: 2 },
  { id: 'b50', type: 'bounces', target: 50, descKey: 'mission.bounce', reward: 8, tier: 2 },
  { id: 'd2k', type: 'distance', target: 2000, descKey: 'mission.climb', reward: 20, tier: 3 },
  { id: 'c50', type: 'coins', target: 50, descKey: 'mission.collectCoins', reward: 18, tier: 3 },
  { id: 'x15', type: 'combo', target: 15, descKey: 'mission.unstoppable', reward: 25, tier: 3 },
  { id: 'g1', type: 'guardian', target: 1, descKey: 'mission.guardian', reward: 15, tier: 3 },
  { id: 'nm8', type: 'nearMiss', target: 8, descKey: 'mission.nearMiss', reward: 18, tier: 3 },
];

// Cumulative lifetime missions (persist across runs)
const CUMULATIVE_MISSIONS = [
  { id: 'lt_c500', type: 'lt_coins', target: 500, descKey: 'mission.lt_coins', reward: 30 },
  { id: 'lt_c2000', type: 'lt_coins', target: 2000, descKey: 'mission.lt_coins', reward: 75 },
  { id: 'lt_b1000', type: 'lt_bounces', target: 1000, descKey: 'mission.lt_bounces', reward: 40 },
  { id: 'lt_d50k', type: 'lt_distance', target: 50000, descKey: 'mission.lt_distance', reward: 50 },
  { id: 'lt_g10', type: 'lt_guardians', target: 10, descKey: 'mission.lt_guardians', reward: 60 },
  { id: 'lt_nm50', type: 'lt_nearMisses', target: 50, descKey: 'mission.lt_nearMisses', reward: 35 },
  { id: 'lt_g50', type: 'lt_games', target: 50, descKey: 'mission.lt_games', reward: 50 },
  { id: 'lt_g200', type: 'lt_games', target: 200, descKey: 'mission.lt_games', reward: 100 },
  { id: 'lt_fire10', type: 'lt_onfire', target: 10, descKey: 'mission.lt_onfire', reward: 45 },
  { id: 'lt_x10', type: 'lt_maxCombo', target: 10, descKey: 'mission.lt_maxCombo', reward: 55 },
  { id: 'lt_c5000', type: 'lt_coins', target: 5000, descKey: 'mission.lt_coins', reward: 150 },
  { id: 'lt_d200k', type: 'lt_distance', target: 200000, descKey: 'mission.lt_distance', reward: 120 },
];

// 7-Day Escalating Daily Calendar Rewards
const DAILY_CALENDAR_REWARDS = [
  { day: 1, coins: 10 },
  { day: 2, coins: 15 },
  { day: 3, coins: 25 },
  { day: 4, coins: 35 },
  { day: 5, coins: 50, bonus: 'powerUpStartToken' },
  { day: 6, coins: 75 },
  { day: 7, coins: 100, bonus: 'gachaToken' },
];

// Daily challenge templates
const DAILY_CHALLENGES = [
  { type: 'distance', target: 1000, descKey: 'daily.climb', reward: 30 },
  { type: 'coins', target: 20, descKey: 'daily.collectCoins', reward: 25 },
  { type: 'combo', target: 8, descKey: 'daily.combo', reward: 30 },
  { type: 'nearMiss', target: 5, descKey: 'daily.nearMiss', reward: 30 },
  { type: 'bounces', target: 40, descKey: 'daily.bounce', reward: 25 },
  { type: 'guardian', target: 2, descKey: 'daily.guardian', reward: 35 },
  { type: 'distance', target: 500, descKey: 'daily.climbNoShield', reward: 35 },
];

// Helper: translate a mission description
function translateDesc(descKey, target) {
  if (!descKey) return '';
  return t(descKey, { target: target.toLocaleString() });
}

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
    // Pilot rank (mission chains)
    this.pilotRank = data.pilotRank || 0;
    this.chainCompletedCount = data.chainCompletedCount || 0;
    // Gacha and power-up start tokens
    this.gachaTokens = data.gachaTokens || 0;
    this.powerUpStartTokens = data.powerUpStartTokens || 0;
    // Personal bests per difficulty
    this.personalBests = data.personalBests || {};

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
        pilotRank: this.pilotRank,
        chainCompletedCount: this.chainCompletedCount,
        gachaTokens: this.gachaTokens,
        powerUpStartTokens: this.powerUpStartTokens,
        personalBests: this.personalBests,
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

  // 7-Day Escalating Daily Calendar
  // Day 1: 10 coins, Day 2: 15, Day 3: 25, Day 4: 35,
  // Day 5: 50 coins + power-up token, Day 6: 75, Day 7: 100 coins + gacha token
  // Missing a day resets to day 1.
  _checkDailyLogin() {
    const today = new Date().toDateString();
    if (this.lastDailyClaimDate === today) {
      this.pendingDailyReward = 0;
      return;
    }
    // Check if the player missed a day (reset to day 0 index)
    if (this.lastDailyClaimDate) {
      const lastDate = new Date(this.lastDailyClaimDate);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays > 1) {
        // Missed a day — reset calendar
        this.dailyLoginDay = 0;
      }
    }
    const calendarRewards = DAILY_CALENDAR_REWARDS;
    this.pendingDailyReward = calendarRewards[this.dailyLoginDay % 7].coins;
  }

  claimDailyReward() {
    if (this.pendingDailyReward <= 0) return { coins: 0, bonus: null };
    const dayIndex = this.dailyLoginDay % 7;
    const calendarEntry = DAILY_CALENDAR_REWARDS[dayIndex];
    const coins = calendarEntry.coins;
    const bonus = calendarEntry.bonus || null;
    this.lastDailyClaimDate = new Date().toDateString();
    this.dailyLoginDay = (this.dailyLoginDay + 1) % 7;
    this.pendingDailyReward = 0;
    // Grant gacha token on day 7
    if (bonus === 'gachaToken') {
      this.gachaTokens = (this.gachaTokens || 0) + 1;
    }
    // Grant power-up start token on day 5
    if (bonus === 'powerUpStartToken') {
      this.powerUpStartTokens = (this.powerUpStartTokens || 0) + 1;
    }
    this.addXP(coins);
    this._save();
    return { coins, bonus };
  }

  getDailyRewardInfo() {
    const rewards = DAILY_CALENDAR_REWARDS.map(r => r.coins);
    return {
      pending: this.pendingDailyReward,
      day: (this.dailyLoginDay % 7) + 1,
      rewards,
    };
  }

  getDailyCalendar() {
    const today = new Date().toDateString();
    const claimed = this.lastDailyClaimDate === today;
    return {
      day: (this.dailyLoginDay % 7) + 1,
      rewards: DAILY_CALENDAR_REWARDS.map((r, i) => ({
        day: i + 1,
        coins: r.coins,
        bonus: r.bonus || null,
      })),
      claimed,
    };
  }

  hasGachaToken() {
    return (this.gachaTokens || 0) > 0;
  }

  useGachaToken() {
    if (!this.hasGachaToken()) return false;
    this.gachaTokens--;
    this._save();
    return true;
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

  getDailyChallenge() {
    if (!this.dailyChallenge) return null;
    return {
      ...this.dailyChallenge,
      desc: this.dailyChallenge.descKey
        ? translateDesc(this.dailyChallenge.descKey, this.dailyChallenge.target)
        : (this.dailyChallenge.desc || ''),
    };
  }

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
        desc: cm.descKey ? translateDesc(cm.descKey, cm.target) : (cm.desc || ''),
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
      descKey: pick.descKey, reward: pick.reward, tier: pick.tier,
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
    // Update personal bests if difficulty is provided
    if (runStats.difficulty) {
      this.updatePersonalBests(runStats.difficulty, runStats);
    }
    this._save();
    return anyCompleted;
  }

  collectRewards() {
    let total = 0;
    const completedMissions = this.missions.filter(m => m.completed);
    completedMissions.forEach(m => {
      total += m.reward;
      this.completedCount++;
      this.completedIds.add(m.id);
      this.chainCompletedCount++;
    });
    this.missions = this.missions.filter(m => !m.completed);
    // Mission chain: when all 3 in a chain are completed, pilot rank increases
    if (this.chainCompletedCount >= 3) {
      const chainsCompleted = Math.floor(this.chainCompletedCount / 3);
      this.pilotRank += chainsCompleted;
      this.chainCompletedCount = this.chainCompletedCount % 3;
    }
    while (this.missions.length < 3) this._addNewMission();
    this._save();
    return total;
  }

  getPilotRank() {
    return this.pilotRank;
  }

  getMissions() {
    return this.missions.map(m => ({
      ...m,
      desc: m.descKey ? translateDesc(m.descKey, m.target) : (m.desc || ''),
    }));
  }
  getStreak() { return this.streak; }

  // Personal bests per difficulty
  _ensurePersonalBests(difficulty) {
    if (!this.personalBests[difficulty]) {
      this.personalBests[difficulty] = {
        bestHeight: 0,
        bestCombo: 0,
        bestCoins: 0,
        longestSurvival: 0,
        mostGuardians: 0,
      };
    }
  }

  getPersonalBests(difficulty) {
    this._ensurePersonalBests(difficulty);
    return { ...this.personalBests[difficulty] };
  }

  updatePersonalBests(difficulty, runStats) {
    this._ensurePersonalBests(difficulty);
    const bests = this.personalBests[difficulty];
    const broken = [];

    const height = runStats.distance || 0;
    if (height > bests.bestHeight) {
      bests.bestHeight = height;
      broken.push('bestHeight');
    }

    const combo = runStats.maxCombo || 0;
    if (combo > bests.bestCombo) {
      bests.bestCombo = combo;
      broken.push('bestCombo');
    }

    const coins = runStats.coins || 0;
    if (coins > bests.bestCoins) {
      bests.bestCoins = coins;
      broken.push('bestCoins');
    }

    const survival = runStats.survivalTime || 0;
    if (survival > bests.longestSurvival) {
      bests.longestSurvival = survival;
      broken.push('longestSurvival');
    }

    const guardians = runStats.guardiansDefeated || 0;
    if (guardians > bests.mostGuardians) {
      bests.mostGuardians = guardians;
      broken.push('mostGuardians');
    }

    if (broken.length > 0) {
      this._save();
    }
    return broken;
  }
}

export default ProgressionManager;
