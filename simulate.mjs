/**
 * Headless game simulation — runs game logic without canvas/browser APIs.
 * Tests all 3 difficulties, auto-launches the bird, and reports bugs/anomalies.
 *
 * Usage:  node simulate.mjs
 */

// ── Minimal browser API mocks ──────────────────────────────────────────────
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'node-simulation' },
  writable: true,
  configurable: true,
});
// Mock canvas for offscreen pre-rendering (Enemy, Player, etc.)
const mockCtx = new Proxy({}, {
  get: () => function() { return mockCtx; },
});
const mockCanvas = {
  width: 0, height: 0,
  getContext() { return mockCtx; },
};
globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
  createElement() { return { ...mockCanvas, width: 0, height: 0, getContext() { return mockCtx; } }; },
};
globalThis.devicePixelRatio = 1;

// ── Import game classes (ESM) ──────────────────────────────────────────────
import Player from './src/Player.js';
import Terrain from './src/Terrain.js';
import Enemy from './src/Enemy.js';
import UFO from './src/UFO.js';
import SpaceJellyfish from './src/SpaceJellyfish.js';
import PlasmaOrb from './src/PlasmaOrb.js';
import CosmicSerpent from './src/CosmicSerpent.js';
import BlackHole from './src/BlackHole.js';
import Coin from './src/Coin.js';
import Spike from './src/Spike.js';
import WallTrap from './src/WallTrap.js';
import PowerUp from './src/PowerUp.js';
import VoidStorm from './src/VoidStorm.js';
import Boss from './src/Boss.js';

// ── Simulation config ──────────────────────────────────────────────────────
const WIDTH = 390;   // iPhone 14 width
const HEIGHT = 844;  // iPhone 14 height
const DT = 1 / 60;   // 60 FPS delta
const MAX_SIM_SECONDS = 300; // 5 minutes max per run
const DIFFICULTIES = ['easy', 'medium', 'hard'];

// ── Bug tracker ────────────────────────────────────────────────────────────
class BugTracker {
  constructor(difficulty) {
    this.difficulty = difficulty;
    this.bugs = [];
    this.warnings = [];
    this.stats = {
      frames: 0,
      maxHeight: 0,
      maxCombo: 0,
      coinsCollected: 0,
      enemiesSpawned: 0,
      deathCause: null,
      powerUpsCollected: 0,
      wallBounces: 0,
      crushDeaths: 0,
      enemyDeaths: 0,
      spikeDeaths: 0,
      trapDeaths: 0,
      stormDeaths: 0,
      stuckFrames: 0,
      maxEntities: 0,
      narrowestCorridor: Infinity,
      bossesEncountered: 0,
      lastSpeedMult: 1.0,
      lastStormSpeed: 0,
    };
  }
  bug(msg, data) { this.bugs.push({ msg, frame: this.stats.frames, ...data }); }
  warn(msg, data) { this.warnings.push({ msg, frame: this.stats.frames, ...data }); }
}

// ── Simulation runner ──────────────────────────────────────────────────────
function simulate(difficulty, godMode = false) {
  const tracker = new BugTracker(difficulty);
  const startY = HEIGHT - 100;

  // Init state (mirrors Game.js initGame)
  const state = {
    player: null,
    leftTerrain: new Terrain('left', WIDTH, HEIGHT * 10, startY),
    rightTerrain: new Terrain('right', WIDTH, HEIGHT * 10, startY),
    enemies: [],
    coins: [],
    spikes: [],
    wallTraps: [],
    powerUps: [],
    explosionParticles: [],
    wallParticles: [],
    coinCollectAnims: [],
    dustParticles: [],
    floatingTexts: [],
    backgroundStars: [],
    cameraY: 0,
    gravity: -0.3,
    lastTime: 0,
    isRunning: true,
    lastEnemySpawnY: 0,
    lastCoinSpawnY: 0,
    lastSpikeSpawnY: 0,
    lastWallTrapSpawnY: 0,
    lastPowerUpSpawnY: 0,
    enemySpawnInterval: 300,
    lastScoreMilestone: 0,
    wasAccelerating: false,
    startingY: startY,
    lowestY: 999999,
    currentScore: 0,
    currentCoinScore: 0,
    shakeIntensity: 0,
    shakeX: 0,
    shakeY: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    voidStorm: null,
    boss: null,
    bossActive: false,
    bossIndex: 0,
    previousBossTypes: [],
    nextBossMilestone: 5000,
    bossDefeatedHeight: 0,
    lastMilestone: 0,
    milestoneFlash: 0,
    milestoneText: '',
    milestoneTextTimer: 0,
    difficulty: difficulty,
  };

  // Init player
  const leftWallX = state.leftTerrain.getMaxXAtY(startY);
  state.player = new Player(leftWallX + 15, startY);
  state.player.isStuck = true;
  state.player.currentSide = 'left';
  state.player.x = leftWallX + state.player.radius;

  // Init void storm (matches Game.js initGame)
  const voidStorm = new VoidStorm(startY, WIDTH);
  if (difficulty === 'easy') {
    voidStorm.baseSpeed = 20;
    voidStorm.y = startY + 900;
  } else if (difficulty === 'hard') {
    voidStorm.baseSpeed = 40;
    voidStorm.y = startY + 500;
  }
  voidStorm.currentSpeed = voidStorm.baseSpeed;
  state.voidStorm = voidStorm;

  let gameOver = false;
  let gameOverReason = '';
  let frameCount = 0;
  const maxFrames = MAX_SIM_SECONDS * 60;

  // Smart auto-play AI: avoids enemies, aims toward safe zones
  const autoLaunch = () => {
    const player = state.player;
    if (!player || !player.isStuck) return;

    const leftB = state.leftTerrain.getMaxXAtY(player.y - 200);
    const rightB = state.rightTerrain.getMinXAtY(player.y - 200);
    const midX = (leftB + rightB) / 2;

    // Aim toward opposite wall
    let targetX;
    if (player.currentSide === 'left') {
      targetX = rightB - 15;
    } else {
      targetX = leftB + 15;
    }

    // Check for enemies in flight path — dodge them
    const flyY = player.y - 200;
    let safestX = targetX;
    let closestThreat = Infinity;

    state.enemies.forEach(e => {
      if (!e.active) return;
      const dy = Math.abs(e.y - flyY);
      if (dy < 150) {
        const dx = Math.abs(e.x - targetX);
        if (dx < closestThreat) {
          closestThreat = dx;
          // Aim away from enemy — shift toward whichever side is farther
          if (e.x > midX) {
            safestX = leftB + 20;
          } else {
            safestX = rightB - 20;
          }
        }
      }
    });

    // Also dodge spikes near landing zone
    state.spikes.forEach(s => {
      if (Math.abs(s.y - flyY) < 100) {
        if (s.side === 'right' && player.currentSide === 'left') {
          // Would land on a spiked right wall — aim shorter
          safestX = midX;
        } else if (s.side === 'left' && player.currentSide === 'right') {
          safestX = midX;
        }
      }
    });

    if (closestThreat < 80) targetX = safestX;

    const targetY = player.y - 200 - Math.random() * 80;
    player.startAiming(targetX, targetY);
    player.updateAim(targetX, targetY);
    player.launch();
  };

  // ── Main loop ────────────────────────────────────────────────────────────
  while (!gameOver && frameCount < maxFrames) {
    frameCount++;
    tracker.stats.frames = frameCount;

    const player = state.player;
    if (!player) { tracker.bug('Player is null'); break; }

    // Auto-launch when stuck (quick reaction)
    if (player.isStuck && frameCount % 8 === 0) {
      autoLaunch();
    }

    // ── Physics ──────────────────────────────────────────────────────────
    const deltaTime = player.hasSlowmo ? DT * 0.4 : DT;
    const emotionSpeed = player.getSpeedMultiplier();
    const speedMult = (player.hasSpeedBoost ? 1.4 : 1.0) * emotionSpeed;

    if (!player.isStuck) {
      player.applyGravity(state.gravity * speedMult, deltaTime);
    }
    player.update(deltaTime);

    // Clamp to screen top
    const screenTop = state.cameraY;
    if (player.y < screenTop + player.radius) {
      player.y = screenTop + player.radius;
      if (player.vy < 0) player.vy = 0;
    }

    // ── Terrain collision ────────────────────────────────────────────────
    const leftBoundary = state.leftTerrain.getMaxXAtY(player.y);
    const rightBoundary = state.rightTerrain.getMinXAtY(player.y);
    const corridorWidth = rightBoundary - leftBoundary;

    if (corridorWidth < tracker.stats.narrowestCorridor) {
      tracker.stats.narrowestCorridor = corridorWidth;
    }

    // BUG CHECK: corridor too narrow to be playable
    if (corridorWidth < player.radius * 2) {
      tracker.bug('Corridor narrower than bird diameter', {
        y: player.y, width: corridorWidth, leftB: leftBoundary, rightB: rightBoundary,
        height: Math.floor(state.startingY - player.y),
      });
    }

    const minSafeWidth = player.radius * 3;
    if (corridorWidth < minSafeWidth) {
      gameOver = true;
      gameOverReason = 'crushed';
      tracker.stats.crushDeaths++;
      break;
    }

    // Check stuck bird pushed into opposite wall
    if (player.isStuck) {
      if (player.currentSide === 'left' && player.x >= rightBoundary - player.radius) {
        gameOver = true;
        gameOverReason = 'crushed_stuck';
        tracker.stats.crushDeaths++;
        break;
      } else if (player.currentSide === 'right' && player.x <= leftBoundary + player.radius) {
        gameOver = true;
        gameOverReason = 'crushed_stuck';
        tracker.stats.crushDeaths++;
        break;
      }
      tracker.stats.stuckFrames++;
    }

    // Wall bounce
    if (!player.isStuck) {
      // Hard clamp — prevent escaping the corridor
      if (player.x < leftBoundary + player.radius) player.x = leftBoundary + player.radius;
      if (player.x > rightBoundary - player.radius) player.x = rightBoundary - player.radius;

      // Clear launchSide once the bird has crossed the corridor midpoint
      if (player.launchSide) {
        const midX = (leftBoundary + rightBoundary) / 2;
        if ((player.launchSide === 'left' && player.x > midX) ||
            (player.launchSide === 'right' && player.x < midX)) {
          player.launchSide = null;
        }
      }

      if (player.x <= leftBoundary + player.radius + 1 && player.launchSide !== 'left') {
        player.stickToWall('left', leftBoundary + player.radius, player.y);
        state.combo++;
        state.comboTimer = 2.0;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;
        tracker.stats.wallBounces++;
      } else if (player.x >= rightBoundary - player.radius - 1 && player.launchSide !== 'right') {
        player.stickToWall('right', rightBoundary - player.radius, player.y);
        state.combo++;
        state.comboTimer = 2.0;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;
        tracker.stats.wallBounces++;
      }
    }

    // ── Score tracking ───────────────────────────────────────────────────
    if (player.y < state.lowestY) {
      state.lowestY = player.y;
      state.currentScore = Math.floor((state.startingY - state.lowestY) / 10);
    }
    tracker.stats.maxHeight = Math.max(tracker.stats.maxHeight, state.currentScore);

    // ── Camera ───────────────────────────────────────────────────────────
    const targetY = player.y - HEIGHT * 0.75;
    state.cameraY = state.cameraY * 0.9 + targetY * 0.1;

    // ── Terrain regeneration ─────────────────────────────────────────────
    const terrainTopY = state.leftTerrain.startY - state.leftTerrain.height;
    if (player.y < terrainTopY + HEIGHT * 5) {
      const newY = player.y + HEIGHT * 3;
      state.leftTerrain = new Terrain('left', WIDTH, HEIGHT * 10, newY);
      state.rightTerrain = new Terrain('right', WIDTH, HEIGHT * 10, newY);

      if (player.isStuck) {
        if (player.currentSide === 'left') {
          player.x = state.leftTerrain.getMaxXAtY(player.y) + player.radius;
        } else {
          player.x = state.rightTerrain.getMinXAtY(player.y) - player.radius;
        }
      }
    }

    // ── Enemy spawning ───────────────────────────────────────────────────
    state.lastEnemySpawnY += deltaTime;
    const heightClimbed = state.startingY - player.y;
    const diff = state.difficulty;
    let spawnInterval = diff === 'easy' ? 3.5 : diff === 'hard' ? 1.8 : 2.5;

    // Context-aware zones
    const segHeight = 80;
    const absSegIdx = Math.round(-state.cameraY / segHeight);
    const zoneIdx = Math.floor(absSegIdx / 15);
    const zoneTypes = ['wide', 'rolling', 'zigzag', 'funnel', 'cavern', 'pinch', 'drift', 'teeth'];
    const currentZone = zoneTypes[Math.floor(Terrain.hash(zoneIdx * 53.1) * zoneTypes.length)];

    if (['pinch', 'teeth', 'funnel'].includes(currentZone)) spawnInterval *= 1.6;
    else if (['cavern', 'wide'].includes(currentZone)) spawnInterval *= 0.75;

    if (state.bossDefeatedHeight > 0 && (heightClimbed - state.bossDefeatedHeight) < 800) {
      spawnInterval *= 2.0;
    }

    if (state.lastEnemySpawnY > spawnInterval && !state.bossActive) {
      const enemyY = state.cameraY - 150;
      const spawnLeft = state.leftTerrain.getMaxXAtY(enemyY);
      const spawnRight = state.rightTerrain.getMinXAtY(enemyY);
      const safeMinX = spawnLeft + 60;
      const safeMaxX = spawnRight - 60;

      if (safeMaxX - safeMinX > 100) {
        const enemyX = safeMinX + Math.random() * (safeMaxX - safeMinX);
        const diffScale = diff === 'easy' ? 1.5 : diff === 'hard' ? 0.6 : 1.0;
        const t1 = 500 * diffScale, t2 = 1500 * diffScale, t3 = 3000 * diffScale;
        const t4 = 5000 * diffScale, t5 = 8000 * diffScale;
        const roll = Math.random();
        let enemy;

        if (heightClimbed < t1) {
          enemy = new Enemy(enemyX, enemyY);
        } else if (heightClimbed < t2) {
          enemy = roll < 0.5 ? new Enemy(enemyX, enemyY) : new SpaceJellyfish(enemyX, enemyY);
        } else if (heightClimbed < t3) {
          enemy = roll < 0.3 ? new Enemy(enemyX, enemyY) :
                  roll < 0.6 ? new SpaceJellyfish(enemyX, enemyY) :
                  new PlasmaOrb(enemyX, enemyY, spawnLeft, spawnRight);
        } else if (heightClimbed < t4) {
          enemy = roll < 0.2 ? new Enemy(enemyX, enemyY) :
                  roll < 0.4 ? new SpaceJellyfish(enemyX, enemyY) :
                  roll < 0.65 ? new PlasmaOrb(enemyX, enemyY, spawnLeft, spawnRight) :
                  new UFO(enemyX, enemyY);
        } else if (heightClimbed < t5) {
          enemy = roll < 0.15 ? new Enemy(enemyX, enemyY) :
                  roll < 0.3 ? new SpaceJellyfish(enemyX, enemyY) :
                  roll < 0.5 ? new PlasmaOrb(enemyX, enemyY, spawnLeft, spawnRight) :
                  roll < 0.7 ? new UFO(enemyX, enemyY) :
                  new CosmicSerpent(enemyX, enemyY, spawnLeft, spawnRight);
        } else {
          enemy = roll < 0.1 ? new Enemy(enemyX, enemyY) :
                  roll < 0.2 ? new SpaceJellyfish(enemyX, enemyY) :
                  roll < 0.35 ? new PlasmaOrb(enemyX, enemyY, spawnLeft, spawnRight) :
                  roll < 0.5 ? new UFO(enemyX, enemyY) :
                  roll < 0.7 ? new CosmicSerpent(enemyX, enemyY, spawnLeft, spawnRight) :
                  new BlackHole(enemyX, enemyY);
        }

        // Apply difficulty-scaled speed multiplier (matches Game.js)
        if (enemy) {
          const maxBoost = diff === 'easy' ? 0.4 : diff === 'hard' ? 1.0 : 0.6;
          const rampDist = diff === 'easy' ? 20000 : diff === 'hard' ? 10000 : 15000;
          const speedMultiplier = 1.0 + maxBoost * Math.min(heightClimbed / rampDist, 1.0);
          if (enemy.vy !== undefined && enemy.vy !== 0) enemy.vy *= speedMultiplier;
          if (enemy.vx !== undefined && enemy.vx !== 0) enemy.vx *= speedMultiplier;
          enemy.speedScale = speedMultiplier;
          tracker.stats.lastSpeedMult = speedMultiplier;
        }

        state.enemies.push(enemy);
        tracker.stats.enemiesSpawned++;
      } else if (safeMaxX - safeMinX <= 0) {
        tracker.warn('Enemy spawn area too narrow', {
          y: enemyY, gap: safeMaxX - safeMinX, height: Math.floor(heightClimbed / 10),
        });
      }
      state.lastEnemySpawnY = 0;
    }

    // ── Coin spawning ────────────────────────────────────────────────────
    state.lastCoinSpawnY += deltaTime;
    if (state.lastCoinSpawnY > 6.0) {
      const coinY = state.cameraY - 150;
      const cl = state.leftTerrain.getMaxXAtY(coinY) + 40;
      const cr = state.rightTerrain.getMinXAtY(coinY) - 40;
      if (cr - cl > 80) {
        const rand = Math.random();
        const type = rand > 0.95 ? 'purple' : rand > 0.8 ? 'silver' : 'gold';
        state.coins.push(new Coin(cl + Math.random() * (cr - cl), coinY, type));
      }
      state.lastCoinSpawnY = 0;
    }

    // ── Spike spawning ───────────────────────────────────────────────────
    state.lastSpikeSpawnY += deltaTime;
    if (state.lastSpikeSpawnY > 5.0 && player.y < state.startingY - 200) {
      const spikeY = state.cameraY - 100;
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const spikeX = side === 'left'
        ? state.leftTerrain.getMaxXAtY(spikeY)
        : state.rightTerrain.getMinXAtY(spikeY);
      const tooClose = state.spikes.some(s => s.side === side && Math.abs(s.y - spikeY) < 150);
      if (!tooClose) {
        const sizes = ['small', 'medium', 'large'];
        state.spikes.push(new Spike(spikeX, spikeY, side, sizes[Math.floor(Math.random() * 3)]));
      }
      state.lastSpikeSpawnY = 0;
    }

    // ── Wall trap spawning ───────────────────────────────────────────────
    state.lastWallTrapSpawnY += deltaTime;
    const wallTrapInterval = diff === 'easy' ? 10.0 : diff === 'hard' ? 5.0 : 7.0;
    if (state.lastWallTrapSpawnY > wallTrapInterval && player.y < state.startingY - 1500) {
      const trapY = state.cameraY - 120;
      const trapSide = Math.random() < 0.5 ? 'left' : 'right';
      const trapX = trapSide === 'left'
        ? state.leftTerrain.getMaxXAtY(trapY)
        : state.rightTerrain.getMinXAtY(trapY);
      const tooClose = state.wallTraps.some(t => t.side === trapSide && Math.abs(t.y - trapY) < 200)
        || state.spikes.some(s => s.side === trapSide && Math.abs(s.y - trapY) < 150);
      if (!tooClose) {
        state.wallTraps.push(new WallTrap(trapX, trapY, trapSide));
      }
      state.lastWallTrapSpawnY = 0;
    }

    // ── Power-up spawning ────────────────────────────────────────────────
    state.lastPowerUpSpawnY += deltaTime;
    if (state.lastPowerUpSpawnY > 15 && player.y < state.startingY - 500) {
      const puY = state.cameraY - 150;
      const puLeft = state.leftTerrain.getMaxXAtY(puY) + 40;
      const puRight = state.rightTerrain.getMinXAtY(puY) - 40;
      if (puRight - puLeft > 60) {
        const types = ['shield', 'magnet', 'slowmo', 'speedboost'];
        state.powerUps.push(new PowerUp(puLeft + Math.random() * (puRight - puLeft), puY, types[Math.floor(Math.random() * 4)]));
      }
      state.lastPowerUpSpawnY = 0;
    }

    // ── Update coins + collision ─────────────────────────────────────────
    state.coins.forEach(c => {
      c.update(deltaTime);
      if (!c.collected && c.checkCollision(player)) {
        c.collected = true;
        const val = Math.round(c.value * Math.max(1, state.combo) * player.getCoinMultiplier());
        state.currentCoinScore += val;
        tracker.stats.coinsCollected++;
        player.addMood(5);
      }
    });
    state.coins = state.coins.filter(c => !c.collected && c.y <= state.cameraY + HEIGHT + 100);

    // ── Update spikes + collision ────────────────────────────────────────
    state.spikes.forEach(s => {
      s.update(deltaTime);
      if (s.checkCollision(player)) {
        if (player.hasShield) {
          player.hasShield = false;
          player.shieldTimer = 0;
        } else {
          gameOver = true;
          gameOverReason = 'spike';
          tracker.stats.spikeDeaths++;
        }
      }
    });
    if (gameOver) break;
    state.spikes = state.spikes.filter(s =>
      s.y <= state.cameraY + HEIGHT + 100 && s.y >= state.cameraY - 200
    );

    // ── Update wall traps + collision ────────────────────────────────────
    state.wallTraps.forEach(t => {
      t.update(deltaTime);
      if (t.checkCollision(player)) {
        if (player.hasShield) {
          player.hasShield = false;
          player.shieldTimer = 0;
        } else {
          gameOver = true;
          gameOverReason = 'wall_trap';
          tracker.stats.trapDeaths++;
        }
      }
    });
    if (gameOver) break;
    state.wallTraps = state.wallTraps.filter(t =>
      t.y <= state.cameraY + HEIGHT + 100 && t.y >= state.cameraY - 200
    );

    // ── Update power-ups + collision ─────────────────────────────────────
    state.powerUps.forEach(pu => {
      pu.update(deltaTime);
      if (pu.checkCollision(player)) {
        pu.collected = true;
        tracker.stats.powerUpsCollected++;
        const dur = pu.durations[pu.type];
        if (pu.type === 'shield') { player.hasShield = true; player.shieldTimer = dur; }
        else if (pu.type === 'magnet') { player.hasMagnet = true; player.magnetTimer = dur; }
        else if (pu.type === 'slowmo') { player.hasSlowmo = true; player.slowmoTimer = dur; }
        else if (pu.type === 'speedboost') { player.hasSpeedBoost = true; player.speedBoostTimer = dur; }
      }
    });
    state.powerUps = state.powerUps.filter(pu => !pu.collected && pu.y <= state.cameraY + HEIGHT + 100);

    // ── Power-up timer decay ─────────────────────────────────────────────
    if (player.hasShield) { player.shieldTimer -= deltaTime; if (player.shieldTimer <= 0) player.hasShield = false; }
    if (player.hasMagnet) { player.magnetTimer -= deltaTime; if (player.magnetTimer <= 0) player.hasMagnet = false; }
    if (player.hasSlowmo) { player.slowmoTimer -= deltaTime; if (player.slowmoTimer <= 0) player.hasSlowmo = false; }
    if (player.hasSpeedBoost) { player.speedBoostTimer -= deltaTime; if (player.speedBoostTimer <= 0) player.hasSpeedBoost = false; }

    // ── Magnet effect ────────────────────────────────────────────────────
    if (player.hasMagnet) {
      state.coins.forEach(c => {
        if (c.collected) return;
        const dx = player.x - c.x, dy = player.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 0) {
          c.x += (dx / dist) * 300 * deltaTime;
          c.y += (dy / dist) * 300 * deltaTime;
        }
      });
    }

    // God mode: auto-shield so we can test deeper gameplay
    if (godMode && !player.hasShield) {
      player.hasShield = true;
      player.shieldTimer = 999;
    }

    // ── Hitbox scaling for enemy collision ────────────────────────────────
    const origRadius = player.radius;
    player.radius = origRadius * player.getHitboxScale();

    // ── Update enemies + collision ───────────────────────────────────────
    state.enemies.forEach(enemy => {
      enemy.update(deltaTime);

      if (enemy instanceof BlackHole && !player.isStuck) {
        enemy.applyGravity(player);
      }

      // Keep enemies in corridor
      const el = state.leftTerrain.getMaxXAtY(enemy.y);
      const er = state.rightTerrain.getMinXAtY(enemy.y);
      if (enemy.x - enemy.radius < el) {
        enemy.x = el + enemy.radius;
        if (enemy instanceof PlasmaOrb) enemy.bounceOffWall(el + enemy.radius, 1);
        else if (enemy.vx) enemy.vx = Math.abs(enemy.vx);
      }
      if (enemy.x + enemy.radius > er) {
        enemy.x = er - enemy.radius;
        if (enemy instanceof PlasmaOrb) enemy.bounceOffWall(er - enemy.radius, -1);
        else if (enemy.vx) enemy.vx = -Math.abs(enemy.vx);
      }

      if (enemy.active && enemy.checkCollision(player)) {
        if (player.hasShield) {
          player.hasShield = false;
          player.shieldTimer = 0;
          enemy.active = false;
        } else {
          gameOver = true;
          gameOverReason = `enemy_${enemy.constructor.name}`;
          tracker.stats.enemyDeaths++;
        }
      }
    });

    player.radius = origRadius;
    if (gameOver) break;

    state.enemies = state.enemies.filter(e => {
      if (state.voidStorm && e.y > state.voidStorm.y) return false;
      if (e.y > state.cameraY + HEIGHT + 100) return false;
      const el = state.leftTerrain.getMaxXAtY(e.y);
      const er = state.rightTerrain.getMinXAtY(e.y);
      if (e.x < el - e.radius || e.x > er + e.radius) return false;
      return true;
    });

    // ── Void storm ───────────────────────────────────────────────────────
    if (state.voidStorm) {
      const heightClimbedForStorm = state.startingY - state.lowestY;
      state.voidStorm.update(deltaTime, player.y, heightClimbedForStorm, state.difficulty);
      tracker.stats.lastStormSpeed = state.voidStorm.currentSpeed;
      if (player.y > state.voidStorm.y) {
        gameOver = true;
        gameOverReason = 'void_storm';
        tracker.stats.stormDeaths++;
      }
    }
    if (gameOver) break;

    // ── Combo decay ──────────────────────────────────────────────────────
    if (state.comboTimer > 0) {
      state.comboTimer -= deltaTime;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    tracker.stats.maxCombo = Math.max(tracker.stats.maxCombo, state.combo);

    // ── Entity count check ───────────────────────────────────────────────
    const totalEntities = state.enemies.length + state.coins.length + state.spikes.length +
      state.wallTraps.length + state.powerUps.length;
    tracker.stats.maxEntities = Math.max(tracker.stats.maxEntities, totalEntities);

    if (totalEntities > 200) {
      tracker.warn('Entity count very high', { count: totalEntities, height: state.currentScore });
    }

    // ── NaN checks ───────────────────────────────────────────────────────
    if (isNaN(player.x) || isNaN(player.y)) {
      tracker.bug('Player position is NaN', { x: player.x, y: player.y });
      break;
    }
    if (isNaN(player.vx) || isNaN(player.vy)) {
      tracker.bug('Player velocity is NaN', { vx: player.vx, vy: player.vy });
      break;
    }
    if (isNaN(state.cameraY)) {
      tracker.bug('Camera Y is NaN');
      break;
    }

    // ── Player out-of-bounds check ───────────────────────────────────────
    if (player.x < -100 || player.x > WIDTH + 100) {
      tracker.bug('Player escaped horizontally', { x: player.x, y: player.y });
    }

    // ── Infinite fall check (player stuck without moving for too long) ───
    if (tracker.stats.stuckFrames > 600) { // 10 seconds stuck
      tracker.warn('Player stuck on wall for 10+ seconds', { y: player.y });
      // Force launch to continue simulation
      autoLaunch();
      tracker.stats.stuckFrames = 0;
    }
  }

  tracker.stats.deathCause = gameOverReason || (frameCount >= maxFrames ? 'timeout' : 'unknown');

  return tracker;
}

// ── Run simulations ────────────────────────────────────────────────────────
console.log('='.repeat(70));
console.log('  STAR HOPPER — HEADLESS SIMULATION');
console.log('  Screen: ' + WIDTH + 'x' + HEIGHT + ' | Max time: ' + MAX_SIM_SECONDS + 's per run');
console.log('='.repeat(70));

const RUNS_PER_DIFFICULTY = 5;
const STRESS_TEST_RUNS = 2; // Extra runs per difficulty with auto-shield for deep testing

for (const diff of DIFFICULTIES) {
  console.log('\n' + '-'.repeat(70));
  console.log(`  DIFFICULTY: ${diff.toUpperCase()} (${RUNS_PER_DIFFICULTY} runs)`);
  console.log('-'.repeat(70));

  for (let run = 0; run < RUNS_PER_DIFFICULTY; run++) {
    try {
      const tracker = simulate(diff);
      const s = tracker.stats;

      console.log(`\n  Run ${run + 1}:`);
      console.log(`    Height: ${s.maxHeight}m | Combo: ${s.maxCombo}x | Coins: ${s.coinsCollected}`);
      console.log(`    Bounces: ${s.wallBounces} | Enemies spawned: ${s.enemiesSpawned} | Power-ups: ${s.powerUpsCollected}`);
      console.log(`    Narrowest corridor: ${s.narrowestCorridor.toFixed(1)}px | Max entities: ${s.maxEntities}`);
      console.log(`    Enemy speed mult: ${s.lastSpeedMult.toFixed(2)}x | Storm speed: ${s.lastStormSpeed.toFixed(1)} px/s`);
      console.log(`    Death: ${s.deathCause}`);
      console.log(`    Frames: ${s.frames} (${(s.frames / 60).toFixed(1)}s)`);

      if (tracker.bugs.length > 0) {
        console.log(`    ** BUGS (${tracker.bugs.length}): **`);
        tracker.bugs.forEach(b => {
          console.log(`      [frame ${b.frame}] ${b.msg}`, JSON.stringify(b, ['y', 'x', 'width', 'height', 'vx', 'vy', 'gap', 'leftB', 'rightB', 'count']));
        });
      }

      if (tracker.warnings.length > 0) {
        console.log(`    Warnings (${tracker.warnings.length}):`);
        // Deduplicate warnings
        const seen = new Set();
        tracker.warnings.forEach(w => {
          const key = w.msg;
          if (!seen.has(key)) {
            seen.add(key);
            const count = tracker.warnings.filter(x => x.msg === key).length;
            console.log(`      ${key} (x${count})`);
          }
        });
      }

      if (tracker.bugs.length === 0 && tracker.warnings.length === 0) {
        console.log(`    No bugs or warnings.`);
      }
    } catch (err) {
      console.log(`\n  Run ${run + 1}: CRASHED`);
      console.log(`    Error: ${err.message}`);
      console.log(`    Stack: ${err.stack?.split('\n').slice(0, 3).join('\n    ')}`);
    }
  }

  // Stress test with god mode (auto-shield) to reach deep gameplay
  for (let run = 0; run < STRESS_TEST_RUNS; run++) {
    try {
      const tracker = simulate(diff, true);
      const s = tracker.stats;

      console.log(`\n  Stress Test ${run + 1} (god mode):`);
      console.log(`    Height: ${s.maxHeight}m | Combo: ${s.maxCombo}x | Coins: ${s.coinsCollected}`);
      console.log(`    Bounces: ${s.wallBounces} | Enemies spawned: ${s.enemiesSpawned} | Power-ups: ${s.powerUpsCollected}`);
      console.log(`    Narrowest corridor: ${s.narrowestCorridor.toFixed(1)}px | Max entities: ${s.maxEntities}`);
      console.log(`    Enemy speed mult: ${s.lastSpeedMult.toFixed(2)}x | Storm speed: ${s.lastStormSpeed.toFixed(1)} px/s`);
      console.log(`    Death/End: ${s.deathCause}`);
      console.log(`    Frames: ${s.frames} (${(s.frames / 60).toFixed(1)}s)`);

      if (tracker.bugs.length > 0) {
        console.log(`    ** BUGS (${tracker.bugs.length}): **`);
        tracker.bugs.forEach(b => {
          console.log(`      [frame ${b.frame}] ${b.msg}`, JSON.stringify(b, ['y', 'x', 'width', 'height', 'vx', 'vy', 'gap', 'leftB', 'rightB', 'count']));
        });
      }

      if (tracker.warnings.length > 0) {
        console.log(`    Warnings (${tracker.warnings.length}):`);
        const seen = new Set();
        tracker.warnings.forEach(w => {
          const key = w.msg;
          if (!seen.has(key)) {
            seen.add(key);
            const count = tracker.warnings.filter(x => x.msg === key).length;
            console.log(`      ${key} (x${count})`);
          }
        });
      }

      if (tracker.bugs.length === 0 && tracker.warnings.length === 0) {
        console.log(`    No bugs or warnings.`);
      }
    } catch (err) {
      console.log(`\n  Stress Test ${run + 1}: CRASHED`);
      console.log(`    Error: ${err.message}`);
      console.log(`    Stack: ${err.stack?.split('\n').slice(0, 3).join('\n    ')}`);
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('  SIMULATION COMPLETE');
console.log('='.repeat(70));
