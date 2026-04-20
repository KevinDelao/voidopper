// Haptic feedback — uses Capacitor Haptics plugin (iOS native)
// and navigator.vibrate fallback (Android + PWA)

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function vibrate(ms) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

export function lightTap() {
  try {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  } catch {
    vibrate(10);
  }
}

export function mediumTap() {
  try {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  } catch {
    vibrate(20);
  }
}

export function heavyTap() {
  try {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
  } catch {
    vibrate(40);
  }
}

// Stronger notification-style haptic for major events (game over, milestones, guardians)
export function notifyTap(type = 'SUCCESS') {
  const typeMap = {
    SUCCESS: NotificationType.Success,
    WARNING: NotificationType.Warning,
    ERROR: NotificationType.Error,
  };
  try {
    Haptics.notification({ type: typeMap[type] || NotificationType.Success }).catch(() => {});
  } catch {
    vibrate(type === 'ERROR' ? 60 : type === 'WARNING' ? 40 : 30);
  }
}

// Rhythmic bounce haptic — varies by mood tier
export function bounceTap(moodTier) {
  try {
    if (moodTier === 'onfire') {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}), 60);
    } else if (moodTier === 'firedup') {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    } else if (moodTier === 'neutral') {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } else {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
  } catch {
    vibrate(moodTier === 'onfire' ? 40 : moodTier === 'firedup' ? 30 : 20);
  }
}

// Selection click for UI interactions (menu taps, toggles)
export function selectionTap() {
  try {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  } catch {
    vibrate(5);
  }
}
