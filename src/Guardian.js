// Guardian — a gauntlet-zone encounter that the player climbs THROUGH.
// No health bar. No stopping. Survive the zone to earn rewards.

// ── MILESTONE BOSSES — unique encounters at specific heights ──────────
const MILESTONE_BOSSES = [
  {
    milestone: 1000,
    name: 'STAR WHELP',
    desc: 'A fledgling star creature guards the lower void',
    color: { primary: '#4488cc', secondary: '#66bbff', glow: '#88ddff' },
    attackPattern: 'shockwave',
    attackInterval: 2.2,
    attackParams: { radius: 400, speed: 200 },
    movementPattern: 'hover_drift',
    movementSpeed: 40,
    size: 28,
    zoneLength: 1800,
    drawStyle: 'crystal',
    reward: 8,
  },
  {
    milestone: 2500,
    name: 'COMET DRAKE',
    desc: 'Dodge the tail!',
    color: { primary: '#ff6622', secondary: '#ffaa44', glow: '#ffcc66' },
    attackPattern: 'comet_rain',
    attackInterval: 1.2,
    attackParams: { count: 3, speed: 180, spread: 0.4 },
    movementPattern: 'zigzag',
    movementSpeed: 95,
    size: 34,
    zoneLength: 2200,
    drawStyle: 'drake',
    reward: 15,
  },
  {
    milestone: 5000,
    name: 'NEBULA TITAN',
    desc: 'Endure the storm!',
    color: { primary: '#9922cc', secondary: '#cc44ff', glow: '#ee88ff' },
    attackPattern: 'spiral_barrage',
    attackInterval: 0.4,
    attackParams: { speed: 130, radius: 5 },
    movementPattern: 'orbit',
    movementSpeed: 50,
    size: 42,
    zoneLength: 2800,
    drawStyle: 'titan',
    reward: 25,
  },
  {
    milestone: 10000,
    name: 'VOID EMPEROR',
    desc: 'Reality bends!',
    color: { primary: '#220044', secondary: '#6600aa', glow: '#aa44ff' },
    attackPattern: 'multi_attack',
    attackInterval: 1.4,
    attackParams: { burstCount: 5, burstSpeed: 150, laserWidth: 7, sweepSpeed: 2.5, vortexRadius: 380, vortexStrength: 140 },
    movementPattern: 'figure_eight',
    movementSpeed: 60,
    size: 48,
    zoneLength: 3200,
    drawStyle: 'emperor',
    reward: 40,
  },
  {
    milestone: 15000,
    name: 'CELESTIAL HYDRA',
    desc: 'Three heads!',
    color: { primary: '#cc2244', secondary: '#ff4466', glow: '#ff88aa' },
    attackPattern: 'hydra_heads',
    attackInterval: 1.0,
    attackParams: { headCount: 3, burstCount: 4, speed: 160, laserWidth: 5, sweepSpeed: 2.5 },
    movementPattern: 'patrol',
    movementSpeed: 70,
    size: 44,
    zoneLength: 3600,
    drawStyle: 'hydra',
    reward: 60,
  },
  {
    milestone: 20000,
    name: 'COSMIC LEVIATHAN',
    desc: 'The final guardian!',
    color: { primary: '#ffd700', secondary: '#ffee44', glow: '#ffffff' },
    attackPattern: 'leviathan',
    attackInterval: 0.8,
    attackParams: { burstCount: 8, burstSpeed: 170, spiralSpeed: 140, minionCount: 4, minionSpeed: 130, shockwaveRadius: 420, shockwaveSpeed: 300 },
    movementPattern: 'figure_eight',
    movementSpeed: 70,
    size: 50,
    zoneLength: 4200,
    drawStyle: 'leviathan',
    reward: 100,
  },
];

// ── DIFFICULTY-SPECIFIC GUARDIANS — appear between milestones ─────────
const EASY_GUARDIANS = [
  {
    name: 'STAR JELLY',
    desc: 'Watch the tentacles!',
    color: { primary: '#44aadd', secondary: '#66ccff', glow: '#88eeff' },
    attackPattern: 'orbit_mines',
    attackInterval: 2.4,
    attackParams: { count: 3, speed: 70, homingStrength: 30 },
    movementPattern: 'hover_drift',
    movementSpeed: 35,
    size: 26,
    drawStyle: 'jelly',
  },
  {
    name: 'DUST SPRITE',
    desc: 'Tiny sparks!',
    color: { primary: '#ffaa44', secondary: '#ffcc66', glow: '#ffee88' },
    attackPattern: 'scatter_shot',
    attackInterval: 1.6,
    attackParams: { count: 5, speed: 110 },
    movementPattern: 'hover_drift',
    movementSpeed: 40,
    size: 24,
    drawStyle: 'sprite',
  },
  {
    name: 'MOON MOTH',
    desc: 'Watch the wings!',
    color: { primary: '#8866cc', secondary: '#aa88ee', glow: '#ccaaff' },
    attackPattern: 'shockwave',
    attackInterval: 2.5,
    attackParams: { radius: 380, speed: 220 },
    movementPattern: 'figure_eight',
    movementSpeed: 45,
    size: 30,
    drawStyle: 'moth',
  },
  {
    name: 'FROST WISP',
    desc: 'Find the gap!',
    color: { primary: '#66ddff', secondary: '#aaeeff', glow: '#ccffff' },
    attackPattern: 'frost_wave',
    attackInterval: 2.0,
    attackParams: { count: 6, speed: 90 },
    movementPattern: 'orbit',
    movementSpeed: 40,
    size: 22,
    drawStyle: 'wisp',
  },
];

const MEDIUM_GUARDIANS = [
  {
    name: 'VOID SENTINEL',
    desc: 'Dodge the spiral!',
    color: { primary: '#6644aa', secondary: '#aa66ff', glow: '#cc88ff' },
    attackPattern: 'spiral_barrage',
    attackInterval: 0.6,
    attackParams: { speed: 130, radius: 4 },
    movementPattern: 'hover_drift',
    movementSpeed: 50,
    size: 32,
    drawStyle: 'sentinel',
  },
  {
    name: 'STORM WEAVER',
    desc: 'Evade the beam!',
    color: { primary: '#cc2244', secondary: '#ff4466', glow: '#ff6688' },
    attackPattern: 'laser_sweep',
    attackInterval: 2.0,
    attackParams: { width: 6, sweepSpeed: 3.0 },
    movementPattern: 'zigzag',
    movementSpeed: 85,
    size: 36,
    drawStyle: 'oracle',
  },
  {
    name: 'GRAVITY WARDEN',
    desc: 'Resist the pull!',
    color: { primary: '#2266cc', secondary: '#44aaff', glow: '#66ccff' },
    attackPattern: 'gravity_pull',
    attackInterval: 2.5,
    attackParams: { radius: 380, strength: 130 },
    movementPattern: 'orbit',
    movementSpeed: 60,
    size: 38,
    drawStyle: 'crystal',
  },
  {
    name: 'SWARM MOTHER',
    desc: 'Outrun the swarm!',
    color: { primary: '#22aa44', secondary: '#44dd66', glow: '#66ff88' },
    attackPattern: 'minion_spawn',
    attackInterval: 1.8,
    attackParams: { count: 5, minionSpeed: 120 },
    movementPattern: 'patrol',
    movementSpeed: 70,
    size: 34,
    drawStyle: 'moth',
  },
  {
    name: 'PHASE SHIFTER',
    desc: 'Watch the ripples!',
    color: { primary: '#ff8800', secondary: '#ffaa00', glow: '#ffcc44' },
    attackPattern: 'shockwave',
    attackInterval: 1.4,
    attackParams: { radius: 400, speed: 250 },
    movementPattern: 'figure_eight',
    movementSpeed: 65,
    size: 30,
    drawStyle: 'nova',
  },
];

const HARD_GUARDIANS = [
  {
    name: 'BLOOD ORACLE',
    desc: 'Dual beams!',
    color: { primary: '#aa0022', secondary: '#dd2244', glow: '#ff4466' },
    attackPattern: 'dual_laser',
    attackInterval: 1.6,
    attackParams: { width: 6, sweepSpeed: 3.5 },
    movementPattern: 'zigzag',
    movementSpeed: 95,
    size: 36,
    drawStyle: 'oracle',
  },
  {
    name: 'DEATH BLOSSOM',
    desc: 'Spiral barrage!',
    color: { primary: '#ff2288', secondary: '#ff44aa', glow: '#ff88cc' },
    attackPattern: 'spiral_barrage',
    attackInterval: 0.35,
    attackParams: { speed: 150, radius: 5 },
    movementPattern: 'orbit',
    movementSpeed: 55,
    size: 34,
    drawStyle: 'blossom',
  },
  {
    name: 'IRON COLOSSUS',
    desc: 'Crush zone!',
    color: { primary: '#666688', secondary: '#8888aa', glow: '#aaaacc' },
    attackPattern: 'multi_attack',
    attackInterval: 1.8,
    attackParams: { burstCount: 6, burstSpeed: 150, laserWidth: 7, sweepSpeed: 2.5, vortexRadius: 380, vortexStrength: 130 },
    movementPattern: 'patrol',
    movementSpeed: 60,
    size: 44,
    drawStyle: 'colossus',
  },
  {
    name: 'SHADOW WRAITH',
    desc: 'It hunts you!',
    color: { primary: '#110022', secondary: '#330066', glow: '#6622aa' },
    attackPattern: 'homing_volley',
    attackInterval: 1.4,
    attackParams: { count: 4, speed: 120, homingStrength: 100 },
    movementPattern: 'chase',
    movementSpeed: 80,
    size: 32,
    drawStyle: 'wraith',
  },
  {
    name: 'TWIN SERPENTS',
    desc: 'Double trouble!',
    color: { primary: '#22cc88', secondary: '#44ffaa', glow: '#88ffcc' },
    attackPattern: 'twin_burst',
    attackInterval: 1.2,
    attackParams: { count: 5, speed: 170, spread: 1.4 },
    movementPattern: 'zigzag',
    movementSpeed: 100,
    size: 30,
    drawStyle: 'serpent',
  },
  {
    name: 'NOVA CORE',
    desc: 'Explosive rings!',
    color: { primary: '#ff4400', secondary: '#ff8844', glow: '#ffcc88' },
    attackPattern: 'nova_burst',
    attackInterval: 1.8,
    attackParams: { ringCount: 10, speed: 180, shockwaveRadius: 400, shockwaveSpeed: 300 },
    movementPattern: 'figure_eight',
    movementSpeed: 50,
    size: 38,
    drawStyle: 'nova',
  },
];

// Helper: get the guardian config for a given height and difficulty
// height is in raw pixels (displayed score = height / 10)
function getGuardianForHeight(height, difficulty, encounterIndex) {
  // Check milestone bosses first (milestones are in display meters, height is pixels)
  const displayHeight = height / 10;
  for (const boss of MILESTONE_BOSSES) {
    if (Math.abs(displayHeight - boss.milestone) < 100) {
      return { ...boss, isMilestone: true };
    }
  }

  // Difficulty-specific pool
  const pool = difficulty === 'easy' ? EASY_GUARDIANS
    : difficulty === 'hard' ? HARD_GUARDIANS
    : MEDIUM_GUARDIANS;

  const type = pool[encounterIndex % pool.length];
  return { ...type, isMilestone: false };
}

class Guardian {
  constructor(corridorLeft, corridorRight, guardianIndex, startHeight, difficulty) {
    const type = getGuardianForHeight(startHeight, difficulty, guardianIndex);
    this.config = type;
    this.name = type.name;
    this.isMilestone = type.isMilestone;
    this.drawStyle = type.drawStyle || 'sentinel';

    // Size scaling
    const growthPerEncounter = type.isMilestone ? 0 : 2;
    const maxGrowth = Math.min(guardianIndex * growthPerEncounter, 12);
    this.radius = type.size + maxGrowth;
    const corridorWidth = corridorRight - corridorLeft;
    if (this.radius * 2 > corridorWidth * 0.6) {
      this.radius = corridorWidth * 0.3;
    }
    this.color = type.color;

    // Position
    this.corridorLeft = corridorLeft;
    this.corridorRight = corridorRight;
    this.corridorCenter = (corridorLeft + corridorRight) / 2;
    this.x = this.corridorCenter;
    this.y = 0;
    this.homeX = this.corridorCenter;

    // Zone tracking
    this.startHeight = startHeight;
    this.zoneLength = type.zoneLength || (2000 + guardianIndex * 200);
    this.progress = 0;
    this.active = true;
    this.exiting = false;
    this.exitTimer = 0;
    this.exitDuration = 1.5;
    this.reward = type.reward || (5 + guardianIndex * 3);

    // Scale difficulty with encounter number
    this.difficultyScale = type.isMilestone ? 1.0 : (1 + guardianIndex * 0.12);

    // Movement
    this.moveTimer = 0;
    this.moveAngle = 0;
    this.patrolDir = 1;
    this.phase = Math.random() * Math.PI * 2;

    // Entrance animation
    this.entranceTimer = 0;
    this.entranceDuration = type.isMilestone ? 2.0 : 1.5;
    this.entered = false;

    // Attacks
    this.attackTimer = 0;
    this.projectiles = [];
    this.minions = [];
    this.laserActive = false;
    this.laserAngle = 0;
    this.laserTimer = 0;
    this.laser2Active = false;
    this.laser2Angle = 0;
    this.laser2Timer = 0;
    this.shockwaveActive = false;
    this.shockwaveRadius = 0;
    this.shockwaveMaxRadius = 0;
    this.vortexActive = false;
    this.vortexTimer = 0;
    this.vortexRadius = 0;
    this.vortexStrength = 0;
    this.spiralAngle = 0;
    this.multiAttackPhase = 0;

    // For hydra heads
    this.heads = [];
    if (type.attackPattern === 'hydra_heads') {
      const hc = type.attackParams.headCount || 3;
      for (let i = 0; i < hc; i++) {
        this.heads.push({
          angle: (i / hc) * Math.PI * 2,
          dist: this.radius * 1.8,
          attackTimer: Math.random() * 2,
        });
      }
    }
  }

  update(deltaTime, playerX, playerY, cameraY, screenHeight, currentHeight) {
    this.phase += 0.04;
    this.moveTimer += deltaTime;

    // Zone progress
    this.progress = Math.min(1, (currentHeight - this.startHeight) / this.zoneLength);

    // Entrance animation
    if (!this.entered) {
      this.entranceTimer += deltaTime;
      if (this.entranceTimer >= this.entranceDuration) {
        this.entered = true;
      }
    }

    // Check if zone complete
    if (this.progress >= 1 && !this.exiting) {
      this.exiting = true;
      this.exitTimer = 0;
      this.projectiles = [];
      this.minions = [];
      this.laserActive = false;
      this.laser2Active = false;
      this.shockwaveActive = false;
      this.vortexActive = false;
    }

    if (this.exiting) {
      this.exitTimer += deltaTime;
      if (this.exitTimer >= this.exitDuration) {
        this.active = false;
      }
      return;
    }

    // Track camera — position at 40% from top so attacks can reach player at 75%
    const targetY = cameraY + screenHeight * 0.4;
    this.y = targetY;

    // Movement
    this._updateMovement(deltaTime, playerX, playerY);

    // Keep in corridor
    const margin = this.radius + 10;
    this.x = Math.max(this.corridorLeft + margin, Math.min(this.corridorRight - margin, this.x));

    // Attacks (only after entrance)
    if (this.entered) {
      const interval = this.config.attackInterval / this.difficultyScale;
      this.attackTimer += deltaTime;
      if (this.attackTimer > interval) {
        this._executeAttack(playerX, playerY);
        this.attackTimer = 0;
      }
    }

    // Update projectiles
    this.projectiles.forEach(p => {
      // Homing projectiles
      if (p.homing && p.homing > 0) {
        const dx = playerX - p.x;
        const dy = playerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          p.vx += (dx / dist) * p.homing * deltaTime;
          p.vy += (dy / dist) * p.homing * deltaTime;
          // Cap speed
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          const maxSpd = (p.maxSpeed || 200);
          if (spd > maxSpd) {
            p.vx = (p.vx / spd) * maxSpd;
            p.vy = (p.vy / spd) * maxSpd;
          }
        }
      }
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.phase = (p.phase || 0) + 0.1;
    });
    this.projectiles = this.projectiles.filter(p => p.life > 0);

    // Update minions
    this.minions.forEach(m => {
      const dx = playerX - m.x;
      const dy = playerY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        m.x += (dx / dist) * m.speed * deltaTime;
        m.y += (dy / dist) * m.speed * deltaTime;
      }
      m.life -= deltaTime;
      m.phase = (m.phase || 0) + 0.08;
    });
    this.minions = this.minions.filter(m => m.life > 0);

    // Update laser
    if (this.laserActive) {
      this.laserTimer -= deltaTime;
      const sweepSpeed = this.config.attackParams.sweepSpeed || 2;
      this.laserAngle += sweepSpeed * deltaTime;
      if (this.laserTimer <= 0) this.laserActive = false;
    }

    // Update second laser (dual_laser, hydra, etc.)
    if (this.laser2Active) {
      this.laser2Timer -= deltaTime;
      const sweepSpeed = this.config.attackParams.sweepSpeed || 2;
      this.laser2Angle -= sweepSpeed * deltaTime;
      if (this.laser2Timer <= 0) this.laser2Active = false;
    }

    // Update shockwave
    if (this.shockwaveActive) {
      const speed = this.config.attackParams.shockwaveSpeed || this.config.attackParams.speed || 150;
      this.shockwaveRadius += speed * deltaTime;
      if (this.shockwaveRadius > this.shockwaveMaxRadius) {
        this.shockwaveActive = false;
      }
    }

    // Update vortex
    if (this.vortexActive) {
      this.vortexTimer -= deltaTime;
      if (this.vortexTimer <= 0) this.vortexActive = false;
    }

    // Update hydra heads
    this.heads.forEach(h => {
      h.angle += 0.8 * deltaTime;
    });
  }

  _updateMovement(deltaTime, playerX, playerY) {
    const speed = this.config.movementSpeed;
    const cw = this.corridorRight - this.corridorLeft;

    switch (this.config.movementPattern) {
      case 'orbit': {
        this.moveAngle += speed * 0.02 * deltaTime;
        const orbitR = cw * 0.25;
        this.x = this.corridorCenter + Math.cos(this.moveAngle) * orbitR;
        break;
      }
      case 'zigzag': {
        this.x += this.patrolDir * speed * deltaTime;
        if (this.x > this.corridorRight - this.radius - 20) this.patrolDir = -1;
        if (this.x < this.corridorLeft + this.radius + 20) this.patrolDir = 1;
        break;
      }
      case 'patrol': {
        this.x += this.patrolDir * speed * deltaTime;
        if (this.x > this.corridorRight - this.radius - 20) this.patrolDir = -1;
        if (this.x < this.corridorLeft + this.radius + 20) this.patrolDir = 1;
        break;
      }
      case 'figure_eight': {
        this.moveAngle += speed * 0.015 * deltaTime;
        const rx = cw * 0.2;
        this.x = this.corridorCenter + Math.sin(this.moveAngle) * rx;
        break;
      }
      case 'chase': {
        // Slowly track player X
        const dx = playerX - this.x;
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * deltaTime);
        break;
      }
      case 'hover_drift':
      default: {
        this.x = this.corridorCenter + Math.sin(this.moveTimer * 0.5) * cw * 0.2;
        break;
      }
    }
  }

  _executeAttack(playerX, playerY) {
    const params = this.config.attackParams;

    switch (this.config.attackPattern) {
      case 'slow_burst':
      case 'projectile_burst': {
        const count = params.count || 5;
        const speed = (params.speed || 120) * this.difficultyScale;
        const spread = params.spread || 1.2;
        const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
        for (let i = 0; i < count; i++) {
          const angle = baseAngle + (i - (count - 1) / 2) * (spread / count);
          this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 4, life: 2.5, phase: 0,
          });
        }
        break;
      }
      case 'comet_rain': {
        const count = params.count || 2;
        const speed = (params.speed || 160) * this.difficultyScale;
        for (let i = 0; i < count; i++) {
          const offsetX = (Math.random() - 0.5) * (this.corridorRight - this.corridorLeft) * 0.8;
          this.projectiles.push({
            x: this.x + offsetX, y: this.y,
            vx: (Math.random() - 0.5) * 30,
            vy: speed * 0.8,
            radius: 6, life: 3.0, phase: 0,
          });
        }
        break;
      }
      case 'spiral_barrage': {
        const speed = (params.speed || 110) * this.difficultyScale;
        const r = params.radius || 4;
        this.spiralAngle += 0.8;
        this.projectiles.push({
          x: this.x, y: this.y,
          vx: Math.cos(this.spiralAngle) * speed,
          vy: Math.sin(this.spiralAngle) * speed,
          radius: r, life: 3.0, phase: 0,
        });
        break;
      }
      case 'laser_sweep': {
        this.laserActive = true;
        this.laserTimer = 1.5;
        this.laserAngle = Math.atan2(playerY - this.y, playerX - this.x);
        break;
      }
      case 'dual_laser': {
        this.laserActive = true;
        this.laserTimer = 1.5;
        this.laserAngle = Math.atan2(playerY - this.y, playerX - this.x);
        this.laser2Active = true;
        this.laser2Timer = 1.5;
        this.laser2Angle = this.laserAngle + Math.PI;
        break;
      }
      case 'minion_spawn': {
        const count = params.count || 3;
        const mSpeed = (params.minionSpeed || 80) * this.difficultyScale;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          this.minions.push({
            x: this.x + Math.cos(angle) * 30,
            y: this.y + Math.sin(angle) * 30,
            speed: mSpeed, radius: 8, life: 4, phase: 0,
          });
        }
        break;
      }
      case 'shockwave': {
        this.shockwaveActive = true;
        this.shockwaveRadius = 0;
        this.shockwaveMaxRadius = params.radius || 380;
        break;
      }
      case 'gravity_pull': {
        this.vortexActive = true;
        this.vortexTimer = 2.5;
        this.vortexRadius = params.radius || 350;
        this.vortexStrength = (params.strength || 100) * this.difficultyScale;
        break;
      }
      case 'homing_volley': {
        const count = params.count || 3;
        const speed = (params.speed || 100) * this.difficultyScale;
        const homing = params.homingStrength || 80;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + this.phase;
          this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed * 0.5,
            vy: Math.sin(angle) * speed * 0.5,
            radius: 5, life: 3.5, phase: 0,
            homing: homing * this.difficultyScale,
            maxSpeed: speed,
          });
        }
        break;
      }
      case 'twin_burst': {
        const count = params.count || 4;
        const speed = (params.speed || 150) * this.difficultyScale;
        const spread = params.spread || 1.2;
        // Fire from two offset positions
        const offsets = [-this.radius * 0.8, this.radius * 0.8];
        offsets.forEach(ox => {
          const baseAngle = Math.atan2(playerY - this.y, playerX - (this.x + ox));
          for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i - (count - 1) / 2) * (spread / count);
            this.projectiles.push({
              x: this.x + ox, y: this.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: 4, life: 3.0, phase: 0,
            });
          }
        });
        break;
      }
      case 'nova_burst': {
        // Ring of projectiles + shockwave
        const ringCount = params.ringCount || 8;
        const speed = (params.speed || 160) * this.difficultyScale;
        for (let i = 0; i < ringCount; i++) {
          const angle = (i / ringCount) * Math.PI * 2;
          this.projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 5, life: 3.0, phase: 0,
          });
        }
        this.shockwaveActive = true;
        this.shockwaveRadius = 0;
        this.shockwaveMaxRadius = params.shockwaveRadius || 380;
        break;
      }
      case 'multi_attack': {
        // Cycles through multiple attack types
        this.multiAttackPhase = (this.multiAttackPhase + 1) % 3;
        if (this.multiAttackPhase === 0) {
          // Burst
          const count = params.burstCount || 4;
          const speed = (params.burstSpeed || 130) * this.difficultyScale;
          const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
          for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i - (count - 1) / 2) * (1.2 / count);
            this.projectiles.push({
              x: this.x, y: this.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: 5, life: 2.5, phase: 0,
            });
          }
        } else if (this.multiAttackPhase === 1) {
          // Laser
          this.laserActive = true;
          this.laserTimer = 1.5;
          this.laserAngle = Math.atan2(playerY - this.y, playerX - this.x);
        } else {
          // Vortex
          this.vortexActive = true;
          this.vortexTimer = 2.0;
          this.vortexRadius = params.vortexRadius || 350;
          this.vortexStrength = (params.vortexStrength || 100) * this.difficultyScale;
        }
        break;
      }
      case 'hydra_heads': {
        // Each head fires independently
        const headParams = params;
        this.heads.forEach((h, idx) => {
          const hx = this.x + Math.cos(h.angle) * h.dist;
          const hy = this.y + Math.sin(h.angle) * h.dist;
          if (idx % 2 === 0) {
            // Burst from head
            const count = headParams.burstCount || 3;
            const speed = (headParams.speed || 140) * this.difficultyScale;
            const baseAngle = Math.atan2(playerY - hy, playerX - hx);
            for (let i = 0; i < count; i++) {
              const angle = baseAngle + (i - (count - 1) / 2) * (1.0 / count);
              this.projectiles.push({
                x: hx, y: hy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 4, life: 3.0, phase: 0,
              });
            }
          } else {
            // Laser from head
            this.laserActive = true;
            this.laserTimer = 1.2;
            this.laserAngle = Math.atan2(playerY - this.y, playerX - this.x);
          }
        });
        break;
      }
      case 'leviathan': {
        // The ultimate boss — cycles through everything
        this.multiAttackPhase = (this.multiAttackPhase + 1) % 5;
        const scale = this.difficultyScale;
        if (this.multiAttackPhase === 0) {
          // Spiral barrage burst
          for (let i = 0; i < 6; i++) {
            const angle = this.spiralAngle + (i / 6) * Math.PI * 2;
            this.spiralAngle += 0.3;
            this.projectiles.push({
              x: this.x, y: this.y,
              vx: Math.cos(angle) * params.spiralSpeed * scale,
              vy: Math.sin(angle) * params.spiralSpeed * scale,
              radius: 4, life: 2.5, phase: 0,
            });
          }
        } else if (this.multiAttackPhase === 1) {
          // Minion spawn
          const mCount = params.minionCount || 3;
          for (let i = 0; i < mCount; i++) {
            const angle = (i / mCount) * Math.PI * 2;
            this.minions.push({
              x: this.x + Math.cos(angle) * 40,
              y: this.y + Math.sin(angle) * 40,
              speed: params.minionSpeed * scale, radius: 8, life: 4, phase: 0,
            });
          }
        } else if (this.multiAttackPhase === 2) {
          // Targeted burst
          const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
          for (let i = 0; i < params.burstCount; i++) {
            const angle = baseAngle + (i - (params.burstCount - 1) / 2) * (1.4 / params.burstCount);
            this.projectiles.push({
              x: this.x, y: this.y,
              vx: Math.cos(angle) * params.burstSpeed * scale,
              vy: Math.sin(angle) * params.burstSpeed * scale,
              radius: 5, life: 2.5, phase: 0,
            });
          }
        } else if (this.multiAttackPhase === 3) {
          // Shockwave
          this.shockwaveActive = true;
          this.shockwaveRadius = 0;
          this.shockwaveMaxRadius = params.shockwaveRadius || 400;
        } else {
          // Dual laser
          this.laserActive = true;
          this.laserTimer = 1.5;
          this.laserAngle = Math.atan2(playerY - this.y, playerX - this.x);
          this.laser2Active = true;
          this.laser2Timer = 1.5;
          this.laser2Angle = this.laserAngle + Math.PI * 0.6;
        }
        break;
      }
      case 'scatter_shot': {
        // Chaotic rapid-fire in random directions
        const count = params.count || 4;
        const speed = (params.speed || 120) * this.difficultyScale;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.projectiles.push({
            x: this.x + (Math.random() - 0.5) * this.radius,
            y: this.y + (Math.random() - 0.5) * this.radius,
            vx: Math.cos(angle) * speed * (0.7 + Math.random() * 0.6),
            vy: Math.sin(angle) * speed * (0.7 + Math.random() * 0.6),
            radius: 3 + Math.random() * 2, life: 3.5, phase: Math.random() * 6,
          });
        }
        break;
      }
      case 'frost_wave': {
        // Wide horizontal wall of slow projectiles spanning the corridor
        const count = params.count || 6;
        const speed = (params.speed || 80) * this.difficultyScale;
        const cw = this.corridorRight - this.corridorLeft;
        // Leave a random gap for the player to squeeze through
        const gapIndex = Math.floor(Math.random() * count);
        for (let i = 0; i < count; i++) {
          if (i === gapIndex) continue; // gap
          const xPos = this.corridorLeft + (i + 0.5) * (cw / count);
          this.projectiles.push({
            x: xPos, y: this.y,
            vx: 0,
            vy: speed,
            radius: 5, life: 4.5, phase: 0,
          });
        }
        break;
      }
      case 'orbit_mines': {
        // Drops mines that orbit around spawn point then drift toward player
        const count = params.count || 4;
        const speed = (params.speed || 60) * this.difficultyScale;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + this.phase;
          const dist = this.radius * 1.5;
          const spawnX = this.x + Math.cos(angle) * dist;
          const spawnY = this.y + Math.sin(angle) * dist;
          // Mines drift slowly toward the player
          const dx = playerX - spawnX;
          const dy = playerY - spawnY;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          this.projectiles.push({
            x: spawnX, y: spawnY,
            vx: (dx / d) * speed + Math.cos(angle) * speed * 0.5,
            vy: (dy / d) * speed + Math.sin(angle) * speed * 0.5,
            radius: 6, life: 3.5, phase: 0,
            homing: params.homingStrength || 40,
            maxSpeed: speed * 1.5,
          });
        }
        break;
      }
      default: break;
    }
  }

  applyVortex(player, dt = 0.016) {
    if (!this.vortexActive) return;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.vortexRadius && dist > 0) {
      const force = this.vortexStrength / (dist * 0.5);
      player.vx += (dx / dist) * force * dt;
      player.vy += (dy / dist) * force * dt;
    }
  }

  checkCollision(player) {
    // Main body (0.85x reduction for fairness — matches enemy collision philosophy)
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.sqrt(dx * dx + dy * dy) < this.radius * 0.85 + player.radius * 0.7) return 'body';

    // Projectiles
    for (const p of this.projectiles) {
      const pdx = player.x - p.x;
      const pdy = player.y - p.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < p.radius + player.radius * 0.6) return 'projectile';
    }

    // Minions
    for (const m of this.minions) {
      const mdx = player.x - m.x;
      const mdy = player.y - m.y;
      if (Math.sqrt(mdx * mdx + mdy * mdy) < m.radius + player.radius * 0.6) return 'minion';
    }

    // Laser(s)
    const lasers = [];
    if (this.laserActive) lasers.push(this.laserAngle);
    if (this.laser2Active) lasers.push(this.laser2Angle);
    for (const lAngle of lasers) {
      const lx = Math.cos(lAngle);
      const ly = Math.sin(lAngle);
      const laserWidth = this.config.attackParams.width || this.config.attackParams.laserWidth || 4;
      const px = player.x - this.x;
      const py = player.y - this.y;
      const dot = px * lx + py * ly;
      if (dot > 0) {
        const crossDist = Math.abs(px * ly - py * lx);
        if (crossDist < laserWidth + player.radius * 0.6) return 'laser';
      }
    }

    // Shockwave ring
    if (this.shockwaveActive) {
      const sdx = player.x - this.x;
      const sdy = player.y - this.y;
      const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
      if (Math.abs(sdist - this.shockwaveRadius) < 10 + player.radius) return 'shockwave';
    }

    // Hydra heads
    for (const h of this.heads) {
      const hx = this.x + Math.cos(h.angle) * h.dist;
      const hy = this.y + Math.sin(h.angle) * h.dist;
      const hdx = player.x - hx;
      const hdy = player.y - hy;
      if (Math.sqrt(hdx * hdx + hdy * hdy) < 14 + player.radius * 0.6) return 'body';
    }

    return null;
  }

  draw(ctx, cameraY, safeTop = 0, screenWidth = 390) {
    const screenY = this.y - cameraY;
    const pulse = Math.sin(this.phase * 2) * 0.1 + 1;
    // Scale factor for iPad — matches Game.js HUD scaling
    const ts = Math.min(2, Math.max(1, screenWidth / 390));

    // Entrance/exit alpha
    let alpha = 1;
    if (!this.entered) {
      alpha = Math.min(1, this.entranceTimer / this.entranceDuration);
    }
    if (this.exiting) {
      alpha = Math.max(0, 1 - this.exitTimer / this.exitDuration);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, screenY);

    // Vortex visual
    if (this.vortexActive) {
      ctx.strokeStyle = 'rgba(150, 50, 200, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, this.vortexRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < 3; i++) {
        const angle = this.phase * 2 + (i * Math.PI * 2) / 3;
        ctx.strokeStyle = 'rgba(150, 50, 200, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let r = 20; r < this.vortexRadius; r += 5) {
          const a = angle + r * 0.03;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
      }
    }

    // Draw based on style
    this._drawBody(ctx, pulse);

    ctx.restore();

    // Draw projectiles
    if (this.projectiles.length > 0) {
      this.projectiles.forEach(p => {
        const py = p.y - cameraY;
        const r = p.radius + Math.sin(p.phase) * 1.5;
        ctx.globalAlpha = alpha;
        // Homing projectiles glow differently
        if (p.homing) {
          ctx.fillStyle = '#ff4488';
          ctx.beginPath();
          ctx.arc(p.x, py, r + 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = this.color.glow;
        ctx.beginPath();
        ctx.arc(p.x, py, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // Draw minions
    this.minions.forEach(m => {
      const my = m.y - cameraY;
      const mPulse = 1 + Math.sin(m.phase) * 0.15;
      ctx.fillStyle = this.color.secondary;
      ctx.beginPath();
      ctx.arc(m.x, my, m.radius * mPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, my - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw laser(s)
    const lasersToRender = [];
    if (this.laserActive) lasersToRender.push({ angle: this.laserAngle, color: '#ff4444' });
    if (this.laser2Active) lasersToRender.push({ angle: this.laser2Angle, color: '#ff8844' });

    lasersToRender.forEach(l => {
      const laserWidth = this.config.attackParams.width || this.config.attackParams.laserWidth || 4;
      const lx = Math.cos(l.angle);
      const ly = Math.sin(l.angle);
      const len = 500;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y - cameraY);

      ctx.strokeStyle = l.color + '44';
      ctx.lineWidth = laserWidth * 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lx * len, ly * len);
      ctx.stroke();

      ctx.strokeStyle = l.color;
      ctx.lineWidth = laserWidth;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lx * len, ly * len);
      ctx.stroke();

      ctx.strokeStyle = '#ffaaaa';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lx * len, ly * len);
      ctx.stroke();
      ctx.restore();
    });

    // Draw shockwave
    if (this.shockwaveActive) {
      const swAlpha = 1 - (this.shockwaveRadius / this.shockwaveMaxRadius);
      ctx.strokeStyle = this.color.glow;
      ctx.lineWidth = 4 * swAlpha;
      ctx.globalAlpha = swAlpha * 0.6;
      ctx.beginPath();
      ctx.arc(this.x, this.y - cameraY, this.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw hydra heads
    this.heads.forEach(h => {
      const hx = Math.cos(h.angle) * h.dist;
      const hy = Math.sin(h.angle) * h.dist;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x + hx, screenY + hy);

      // Head body
      const hGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, 14);
      hGrad.addColorStop(0, this.color.secondary);
      hGrad.addColorStop(1, this.color.primary);
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Head eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(3, -3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(4, -3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Neck line
      ctx.strokeStyle = this.color.secondary + '88';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-hx * 0.7, -hy * 0.7);
      ctx.stroke();

      ctx.restore();
    });

    // Zone progress bar (scaled for iPad)
    if (!this.exiting && this.entered) {
      const barW = Math.round(200 * ts);
      const barH = this.isMilestone ? Math.round(6 * ts) : Math.round(4 * ts);
      const barX = (this.corridorLeft + this.corridorRight) / 2 - barW / 2;
      const barScreenY = Math.round(125 * ts) + safeTop;

      ctx.save();

      // Milestone badge
      if (this.isMilestone) {
        ctx.font = `bold ${Math.round(10 * ts)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('MILESTONE BOSS', (this.corridorLeft + this.corridorRight) / 2, barScreenY - Math.round(22 * ts));
      }

      // Name
      ctx.font = `bold ${Math.round(13 * ts)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = this.color.glow;
      ctx.fillText(this.name, (this.corridorLeft + this.corridorRight) / 2, barScreenY - Math.round(10 * ts));

      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(barX, barScreenY, barW, barH);

      // Progress fill
      const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      fillGrad.addColorStop(0, this.color.primary);
      fillGrad.addColorStop(1, this.color.glow);
      ctx.fillStyle = fillGrad;
      ctx.fillRect(barX, barScreenY, barW * this.progress, barH);

      // Border
      ctx.strokeStyle = this.isMilestone ? '#ffd700' : '#ffffff44';
      ctx.lineWidth = this.isMilestone ? 1.5 * ts : ts;
      ctx.strokeRect(barX, barScreenY, barW, barH);
      ctx.restore();
    }
  }

  _drawBody(ctx, pulse) {
    const r = this.radius;

    // Outer glow aura
    const auraSize = r * (2 + (this.exiting ? this.exitTimer * 3 : 0));
    ctx.fillStyle = this.color.glow + '20';
    ctx.beginPath();
    ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
    ctx.fill();

    switch (this.drawStyle) {
      case 'crystal': {
        // Geometric crystal shape
        ctx.fillStyle = this.color.primary;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = this.phase * 0.3 + (i / 6) * Math.PI * 2;
          const cr = r * pulse * (i % 2 === 0 ? 1 : 0.7);
          if (i === 0) ctx.moveTo(Math.cos(a) * cr, Math.sin(a) * cr);
          else ctx.lineTo(Math.cos(a) * cr, Math.sin(a) * cr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.color.glow;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner glow
        ctx.fillStyle = this.color.glow + '66';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'drake': {
        // Dragon-like shape with wings
        const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * pulse);
        bodyGrad.addColorStop(0, this.color.glow);
        bodyGrad.addColorStop(0.5, this.color.primary);
        bodyGrad.addColorStop(1, this.color.primary + '88');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = this.color.secondary + 'aa';
        const wingSpread = Math.sin(this.phase * 1.5) * 0.3 + 0.8;
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, 0);
        ctx.quadraticCurveTo(-r * 2 * wingSpread, -r * 0.8, -r * 1.5 * wingSpread, r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * 0.3, 0);
        ctx.quadraticCurveTo(r * 2 * wingSpread, -r * 0.8, r * 1.5 * wingSpread, r * 0.2);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.arc(r * 0.25, -r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'titan': {
        // Massive nebula cloud body
        for (let i = 3; i >= 0; i--) {
          const layerR = r * pulse * (0.5 + i * 0.2);
          const hue = (this.phase * 20 + i * 30) % 360;
          ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${0.2 + (3 - i) * 0.15})`;
          ctx.beginPath();
          ctx.arc(
            Math.sin(this.phase + i) * r * 0.1,
            Math.cos(this.phase * 0.7 + i) * r * 0.1,
            layerR, 0, Math.PI * 2
          );
          ctx.fill();
        }
        // Core
        ctx.fillStyle = this.color.glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Orbiting particles
        for (let i = 0; i < 5; i++) {
          const a = this.phase + (i / 5) * Math.PI * 2;
          const orbitR = r * 0.8;
          ctx.fillStyle = this.color.glow;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'emperor': {
        // Dark void body with crown-like spikes
        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * pulse);
        bodyGrad.addColorStop(0, '#000000');
        bodyGrad.addColorStop(0.5, this.color.primary);
        bodyGrad.addColorStop(1, this.color.secondary + '66');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Crown spikes
        ctx.fillStyle = this.color.glow;
        for (let i = 0; i < 8; i++) {
          const a = this.phase * 0.2 + (i / 8) * Math.PI * 2;
          const spikeR = r * 1.3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a - 0.1) * r * 0.9, Math.sin(a - 0.1) * r * 0.9);
          ctx.lineTo(Math.cos(a) * spikeR, Math.sin(a) * spikeR);
          ctx.lineTo(Math.cos(a + 0.1) * r * 0.9, Math.sin(a + 0.1) * r * 0.9);
          ctx.closePath();
          ctx.fill();
        }
        // Central eye
        this._drawEye(ctx, r);
        break;
      }
      case 'hydra': {
        // Multi-bodied form
        const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * pulse);
        bodyGrad.addColorStop(0, this.color.secondary);
        bodyGrad.addColorStop(0.6, this.color.primary);
        bodyGrad.addColorStop(1, this.color.primary + '44');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Armored segments
        ctx.strokeStyle = this.color.glow + '88';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const segR = r * (0.4 + i * 0.15);
          ctx.beginPath();
          ctx.arc(0, 0, segR, 0, Math.PI * 2);
          ctx.stroke();
        }
        this._drawEye(ctx, r);
        break;
      }
      case 'leviathan': {
        // Golden cosmic entity
        // Outer energy rings
        for (let i = 0; i < 3; i++) {
          const ringR = r * (1.2 + i * 0.3);
          const ringAlpha = 0.3 - i * 0.08;
          ctx.strokeStyle = `rgba(255, 215, 0, ${ringAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, this.phase + i, this.phase + i + Math.PI * 1.5);
          ctx.stroke();
        }
        // Body
        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * pulse);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.3, this.color.primary);
        bodyGrad.addColorStop(0.7, this.color.secondary);
        bodyGrad.addColorStop(1, this.color.primary + '44');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Multiple eyes
        for (let i = 0; i < 3; i++) {
          const ex = (i - 1) * r * 0.3;
          const ey = -r * 0.15;
          ctx.fillStyle = '#000011';
          ctx.beginPath();
          ctx.ellipse(ex, ey, r * 0.15, r * 0.1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.ellipse(ex, ey, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'jelly': {
        // Cute translucent jellyfish shape
        ctx.fillStyle = this.color.primary + '88';
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * pulse, Math.PI, 0);
        ctx.quadraticCurveTo(r * pulse, r * 0.4, 0, r * 0.6);
        ctx.quadraticCurveTo(-r * pulse, r * 0.4, -r * pulse, 0);
        ctx.fill();
        // Tentacles
        ctx.strokeStyle = this.color.glow + '66';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const tx = (i - 1.5) * r * 0.4;
          ctx.beginPath();
          ctx.moveTo(tx, r * 0.3);
          ctx.quadraticCurveTo(tx + Math.sin(this.phase + i) * 8, r * 0.8, tx + Math.sin(this.phase * 1.5 + i) * 12, r * 1.2);
          ctx.stroke();
        }
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.1, r * 0.15, 0, Math.PI * 2);
        ctx.arc(r * 0.2, -r * 0.1, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-r * 0.15, -r * 0.1, r * 0.07, 0, Math.PI * 2);
        ctx.arc(r * 0.25, -r * 0.1, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'sprite':
      case 'wisp': {
        // Glowing orb with flickering particles
        const glowSize = r * pulse * 1.3;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        grad.addColorStop(0, this.color.glow);
        grad.addColorStop(0.4, this.color.primary);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();
        // Sparkle particles around it
        for (let i = 0; i < 6; i++) {
          const a = this.phase * 1.5 + (i / 6) * Math.PI * 2;
          const sr = r * (0.8 + Math.sin(this.phase * 3 + i) * 0.4);
          ctx.fillStyle = this.color.glow;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * sr, Math.sin(a) * sr, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'moth': {
        // Moth with large patterned wings
        const wingAngle = Math.sin(this.phase * 2) * 0.3;
        // Left wing
        ctx.save();
        ctx.rotate(-wingAngle);
        ctx.fillStyle = this.color.primary + 'cc';
        ctx.beginPath();
        ctx.ellipse(-r * 0.8, 0, r * 1.0, r * 0.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.color.glow + '44';
        ctx.beginPath();
        ctx.ellipse(-r * 0.8, 0, r * 0.5, r * 0.3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Right wing
        ctx.save();
        ctx.rotate(wingAngle);
        ctx.fillStyle = this.color.primary + 'cc';
        ctx.beginPath();
        ctx.ellipse(r * 0.8, 0, r * 1.0, r * 0.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.color.glow + '44';
        ctx.beginPath();
        ctx.ellipse(r * 0.8, 0, r * 0.5, r * 0.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Body
        ctx.fillStyle = this.color.secondary;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.25, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-r * 0.12, -r * 0.35, r * 0.1, 0, Math.PI * 2);
        ctx.arc(r * 0.12, -r * 0.35, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'oracle': {
        // Floating eye with arcane rings
        ctx.strokeStyle = this.color.glow + '88';
        ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          const orbitR = r * (1.2 + i * 0.4);
          ctx.arc(0, 0, orbitR, this.phase * (i % 2 === 0 ? 1 : -1), this.phase * (i % 2 === 0 ? 1 : -1) + Math.PI * 1.3);
          ctx.stroke();
        }
        // Body
        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * pulse);
        bodyGrad.addColorStop(0, this.color.secondary);
        bodyGrad.addColorStop(1, this.color.primary);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        this._drawEye(ctx, r);
        break;
      }
      case 'blossom': {
        // Flower-like rotating petals
        const petalCount = 8;
        for (let i = 0; i < petalCount; i++) {
          const a = this.phase * 0.5 + (i / petalCount) * Math.PI * 2;
          ctx.fillStyle = i % 2 === 0 ? this.color.primary + 'cc' : this.color.secondary + 'cc';
          ctx.save();
          ctx.rotate(a);
          ctx.beginPath();
          ctx.ellipse(r * 0.6, 0, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Center
        ctx.fillStyle = this.color.glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000011';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'colossus': {
        // Armored hulking shape
        ctx.fillStyle = this.color.primary;
        ctx.beginPath();
        ctx.moveTo(0, -r * pulse);
        ctx.lineTo(r * 0.8 * pulse, -r * 0.3);
        ctx.lineTo(r * pulse, r * 0.5);
        ctx.lineTo(r * 0.4, r * pulse);
        ctx.lineTo(-r * 0.4, r * pulse);
        ctx.lineTo(-r * pulse, r * 0.5);
        ctx.lineTo(-r * 0.8 * pulse, -r * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.color.glow;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Armor lines
        ctx.strokeStyle = this.color.secondary + '88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.1);
        ctx.lineTo(r * 0.5, -r * 0.1);
        ctx.moveTo(-r * 0.3, r * 0.3);
        ctx.lineTo(r * 0.3, r * 0.3);
        ctx.stroke();
        // Visor
        ctx.fillStyle = this.color.glow;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.25, r * 0.35, r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'wraith': {
        // Ghostly fading form
        for (let i = 3; i >= 0; i--) {
          const offset = Math.sin(this.phase * 1.5 + i) * r * 0.15;
          ctx.fillStyle = this.color.primary + (i === 0 ? 'cc' : '44');
          ctx.beginPath();
          ctx.arc(offset, i * r * 0.1, r * pulse * (1 - i * 0.1), 0, Math.PI * 2);
          ctx.fill();
        }
        // Glowing eyes
        ctx.fillStyle = this.color.glow;
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.1, r * 0.12, 0, Math.PI * 2);
        ctx.arc(r * 0.2, -r * 0.1, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'serpent': {
        // Twin coiling snakes
        for (let s = -1; s <= 1; s += 2) {
          ctx.strokeStyle = this.color.primary;
          ctx.lineWidth = r * 0.3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let t = 0; t < 8; t++) {
            const sx = s * Math.sin(this.phase + t * 0.5) * r * 0.4;
            const sy = (t - 4) * r * 0.2;
            if (t === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
          // Head
          const hx = s * Math.sin(this.phase) * r * 0.4;
          ctx.fillStyle = this.color.secondary;
          ctx.beginPath();
          ctx.arc(hx, -r * 0.8, r * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(hx + s * 3, -r * 0.85, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'nova': {
        // Pulsing fiery core
        const coreR = r * pulse;
        for (let i = 2; i >= 0; i--) {
          ctx.fillStyle = i === 0 ? this.color.glow : i === 1 ? this.color.secondary + '88' : this.color.primary + '44';
          ctx.beginPath();
          ctx.arc(0, 0, coreR * (0.4 + i * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
        // Solar flares
        for (let i = 0; i < 6; i++) {
          const a = this.phase * 0.8 + (i / 6) * Math.PI * 2;
          const flareLen = r * (0.8 + Math.sin(this.phase * 3 + i * 2) * 0.4);
          ctx.strokeStyle = this.color.glow + '88';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
          ctx.lineTo(Math.cos(a) * flareLen, Math.sin(a) * flareLen);
          ctx.stroke();
        }
        break;
      }
      default: {
        // Default sentinel style (original)
        const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * pulse);
        bodyGrad.addColorStop(0, this.color.primary);
        bodyGrad.addColorStop(0.6, this.color.secondary);
        bodyGrad.addColorStop(1, this.color.secondary + '88');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Inner rotating plates
        ctx.strokeStyle = this.color.glow + '66';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const a = this.phase * 0.5 + (i * Math.PI) / 3;
          const r1 = r * 0.3;
          const r2 = r * 0.75;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          ctx.stroke();
        }
        this._drawEye(ctx, r);
        break;
      }
    }
  }

  _drawEye(ctx, r) {
    const eyeSize = r * 0.35;
    ctx.fillStyle = '#000011';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color.glow;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, eyeSize * 0.5, eyeSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, eyeSize * 0.15, eyeSize * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Export the milestone list for Game.js to schedule bosses
Guardian.MILESTONES = MILESTONE_BOSSES.map(b => b.milestone);

export default Guardian;
