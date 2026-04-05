const FALLBACK_BOSSES = [
  {
    name: "Nebula Drifter",
    description: "A gaseous entity that phases between dimensions",
    health: 3,
    size: 30,
    color: { primary: "#6644aa", secondary: "#aa66ff", glow: "#cc88ff", eye: "#ff44cc" },
    phases: [
      { healthThreshold: 1.0, movementPattern: "hover_drift", movementSpeed: 50, attackPattern: "homing_orbs", attackInterval: 3.0, attackParams: { count: 3, speed: 70, turnRate: 2.0 } },
      { healthThreshold: 0.5, movementPattern: "chase", movementSpeed: 80, attackPattern: "homing_orbs", attackInterval: 2.5, attackParams: { count: 2, speed: 50, turnRate: 1.0 } }
    ],
    specialAbility: { type: "teleport", cooldown: 5, description: "Blinks to a random position" },
    personality: "cunning"
  },
  {
    name: "Crimson Maw",
    description: "A ravenous void creature that devours starlight",
    health: 5,
    size: 35,
    color: { primary: "#cc2244", secondary: "#ff4466", glow: "#ff6688", eye: "#ffcc00" },
    phases: [
      { healthThreshold: 1.0, movementPattern: "patrol", movementSpeed: 60, attackPattern: "projectile_burst", attackInterval: 2.5, attackParams: { count: 5, speed: 150, spread: 1.2 } },
      { healthThreshold: 0.5, movementPattern: "zigzag", movementSpeed: 100, attackPattern: "projectile_burst", attackInterval: 1.8, attackParams: { count: 8, speed: 110, spread: 2.5 } }
    ],
    specialAbility: { type: "shield_burst", cooldown: 6, description: "Emits a damaging shield pulse" },
    personality: "aggressive"
  },
  {
    name: "Glacial Phantom",
    description: "An ancient ice specter from the void between stars",
    health: 7,
    size: 40,
    color: { primary: "#2266cc", secondary: "#44aaff", glow: "#66ccff", eye: "#ffffff" },
    phases: [
      { healthThreshold: 1.0, movementPattern: "figure_eight", movementSpeed: 45, attackPattern: "projectile_burst", attackInterval: 2.5, attackParams: { count: 5, speed: 90, spread: 2.0 } },
      { healthThreshold: 0.5, movementPattern: "orbit", movementSpeed: 90, attackPattern: "minion_spawn", attackInterval: 2.0, attackParams: { count: 3, minionSpeed: 90 } }
    ],
    specialAbility: { type: "split_clone", cooldown: 7, description: "Creates a decoy clone" },
    personality: "defensive"
  },
  {
    name: "Solar Berserker",
    description: "A burning star fragment gone mad with power",
    health: 9,
    size: 45,
    color: { primary: "#ff8800", secondary: "#ffaa00", glow: "#ffcc44", eye: "#ff0000" },
    phases: [
      { healthThreshold: 1.0, movementPattern: "zigzag", movementSpeed: 80, attackPattern: "projectile_burst", attackInterval: 2.0, attackParams: { count: 6, speed: 120, spread: 1.8 } },
      { healthThreshold: 0.5, movementPattern: "chase", movementSpeed: 140, attackPattern: "projectile_burst", attackInterval: 1.2, attackParams: { count: 8, speed: 200, spread: 2.0 } }
    ],
    specialAbility: { type: "teleport", cooldown: 6, description: "Blinks to a random position" },
    personality: "berserker"
  }
];

class BossAIGenerator {
  constructor() {
    this.fallbackIndex = 0;
  }

  async fetchBossConfig(heightMilestone, bossIndex, previousBossTypes) {
    return this.getFallbackBoss(bossIndex);
  }

  prefetchBossConfig() {
    // No-op: using local boss generation only
  }

  getFallbackBoss(bossIndex) {
    const boss = { ...FALLBACK_BOSSES[this.fallbackIndex % FALLBACK_BOSSES.length] };
    // Scale health with boss index
    boss.health = 3 + bossIndex * 2;
    boss.size = 30 + Math.min(bossIndex * 5, 25);
    this.fallbackIndex++;
    return boss;
  }
}

export default BossAIGenerator;
