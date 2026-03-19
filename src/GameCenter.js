import { Capacitor, registerPlugin } from '@capacitor/core';

const GameCenterNative = Capacitor.isNativePlatform()
  ? registerPlugin('GameCenter')
  : null;

// Leaderboard IDs — must match what you create in App Store Connect
export const LEADERBOARD_IDS = {
  easy: 'com.voidhopper.leaderboard.easy',
  medium: 'com.voidhopper.leaderboard.medium',
  hard: 'com.voidhopper.leaderboard.hard',
};

let authenticated = false;

export async function authenticateGameCenter() {
  if (!GameCenterNative) return false;
  try {
    const result = await GameCenterNative.authenticate();
    authenticated = result.authenticated;
    return authenticated;
  } catch (e) {
    return false;
  }
}

export async function submitScore(difficulty, score) {
  if (!GameCenterNative || !authenticated || score <= 0) return;
  const leaderboardID = LEADERBOARD_IDS[difficulty] || LEADERBOARD_IDS.medium;
  try {
    await GameCenterNative.submitScore({ score, leaderboardID });
  } catch (e) {
    // Silent fail — don't disrupt gameplay
  }
}

export async function showLeaderboard(difficulty) {
  if (!GameCenterNative || !authenticated) return;
  const leaderboardID = difficulty ? LEADERBOARD_IDS[difficulty] : '';
  try {
    await GameCenterNative.showLeaderboard({ leaderboardID });
  } catch (e) {
    // Silent fail
  }
}

export function isAuthenticated() {
  return authenticated;
}
