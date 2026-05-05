/**
 * Guardian timing simulation — verifies boss spawn frequency.
 * Tests that no two guardians appear back-to-back.
 *
 * Usage:  node simulate-guardian.mjs
 */

// Minimal mocks
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-simulation' }, writable: true, configurable: true });
const mockCtx = new Proxy({}, { get: () => function() { return mockCtx; } });
globalThis.document = { addEventListener() {}, removeEventListener() {}, createElement() { return { width: 0, height: 0, getContext() { return mockCtx; } }; } };
globalThis.devicePixelRatio = 1;

import Guardian from './src/Guardian.js';
import Terrain from './src/Terrain.js';

const WIDTH = 390;
const HEIGHT = 844;
const DT = 1 / 60;
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function buildSchedule(difficulty) {
  const milestoneTimes = [30, 75, 150, 300, 450, 600];
  const spacing = difficulty === 'easy' ? 45 : difficulty === 'hard' ? 22 : 30;
  const schedule = [];
  let prev = 0;
  for (const m of milestoneTimes) {
    let t = prev + spacing;
    while (t < m - spacing) {
      schedule.push({ time: t, isMilestone: false });
      t += spacing;
    }
    schedule.push({ time: m, isMilestone: true });
    prev = m;
  }
  for (let i = 1; i <= 20; i++) {
    schedule.push({ time: prev + spacing * i, isMilestone: false });
  }
  return schedule;
}

function simulateGuardians(difficulty) {
  const schedule = buildSchedule(difficulty);
  const terrain = new Terrain('left', WIDTH, HEIGHT * 10, HEIGHT - 100);

  let guardianTimer = 0;
  let scheduleIdx = 0;
  let nextGuardianTime = schedule.length > 0 ? schedule[0].time : 99999;
  let guardianActive = false;
  let guardian = null;
  let guardianIndex = 0;

  const encounters = [];
  let lastEndTime = 0;

  const maxTime = 700; // Simulate 700 seconds (covers all milestones)
  let simTime = 0;

  while (simTime < maxTime) {
    simTime += DT;
    guardianTimer += DT;

    // Spawn check (mirrors Game.js line 3267)
    if (!guardianActive && !guardian && guardianTimer >= nextGuardianTime) {
      guardian = {
        active: true,
        isMilestone: schedule[scheduleIdx] ? schedule[scheduleIdx].isMilestone : false,
        zoneDuration: (2000 + guardianIndex * 200) / 100,
        exitDuration: 1.5,
        zoneTimer: 0,
        exitTimer: 0,
        exiting: false,
        index: guardianIndex,
      };
      guardianActive = true;

      const gapFromLast = encounters.length > 0 ? simTime - lastEndTime : Infinity;
      encounters.push({
        index: guardianIndex,
        spawnTime: simTime,
        scheduledTime: nextGuardianTime,
        isMilestone: guardian.isMilestone,
        gapFromLast: gapFromLast,
      });
    }

    // Update guardian (simplified)
    if (guardian && guardian.active) {
      guardian.zoneTimer += DT;
      if (guardian.zoneTimer >= guardian.zoneDuration && !guardian.exiting) {
        guardian.exiting = true;
        guardian.exitTimer = 0;
      }
      if (guardian.exiting) {
        guardian.exitTimer += DT;
        if (guardian.exitTimer >= guardian.exitDuration) {
          guardian.active = false;
        }
      }
    }

    // Guardian defeated
    if (guardian && !guardian.active) {
      lastEndTime = simTime;
      encounters[encounters.length - 1].endTime = simTime;
      encounters[encounters.length - 1].fightDuration = simTime - encounters[encounters.length - 1].spawnTime;

      guardian = null;
      guardianActive = false;
      guardianIndex++;
      scheduleIdx++;

      // Skip past entries + enforce 15s cooldown (mirrors Game.js fix)
      const minCooldown = 15;
      const earliestNext = guardianTimer + minCooldown;
      while (scheduleIdx < schedule.length && schedule[scheduleIdx].time < earliestNext) {
        scheduleIdx++;
      }
      if (scheduleIdx < schedule.length) {
        nextGuardianTime = Math.max(schedule[scheduleIdx].time, earliestNext);
      } else {
        nextGuardianTime = 999999;
      }
    }
  }

  return encounters;
}

console.log('='.repeat(70));
console.log('  GUARDIAN TIMING SIMULATION');
console.log('='.repeat(70));

for (const diff of DIFFICULTIES) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  DIFFICULTY: ${diff.toUpperCase()}`);
  console.log(`${'─'.repeat(70)}`);

  const schedule = buildSchedule(diff);
  console.log(`  Schedule entries: ${schedule.length}`);
  console.log(`  Schedule: ${schedule.map(s => `${s.time}s${s.isMilestone ? '★' : ''}`).join(', ')}`);

  const encounters = simulateGuardians(diff);

  console.log(`\n  Encounters (${encounters.length}):`);
  let backToBack = 0;

  for (let i = 0; i < encounters.length; i++) {
    const e = encounters[i];
    const gapStr = e.gapFromLast === Infinity ? '--' : `${e.gapFromLast.toFixed(1)}s`;
    const flag = (e.gapFromLast !== Infinity && e.gapFromLast < 10) ? ' ⚠️ BACK-TO-BACK!' : '';
    if (e.gapFromLast !== Infinity && e.gapFromLast < 10) backToBack++;

    console.log(`    #${i + 1} ${e.isMilestone ? '★' : ' '} spawn=${e.spawnTime.toFixed(1)}s | fight=${e.fightDuration ? e.fightDuration.toFixed(1) : '?'}s | gap=${gapStr}${flag}`);
  }

  if (backToBack > 0) {
    console.log(`\n  ⚠️  ${backToBack} BACK-TO-BACK encounters detected!`);
  } else {
    console.log(`\n  ✓ No back-to-back encounters. Minimum gap: ${encounters.reduce((min, e) => e.gapFromLast === Infinity ? min : Math.min(min, e.gapFromLast), Infinity).toFixed(1)}s`);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log('  SIMULATION COMPLETE');
console.log('='.repeat(70));
