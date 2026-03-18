// Safe localStorage wrapper — prevents crashes in private browsing / storage full scenarios

// One-time shop reset: only default bird + default trail are free
(function resetShopOnce() {
  try {
    if (!localStorage.getItem('voidHopper_shopReset_v1')) {
      localStorage.setItem('voidHopper_unlockedSkins', JSON.stringify(['default']));
      localStorage.setItem('voidHopper_unlockedTrails', JSON.stringify(['none']));
      localStorage.setItem('voidHopper_selectedSkin', 'default');
      localStorage.setItem('voidHopper_selectedTrail', 'none');
      localStorage.setItem('voidHopper_shopReset_v1', '1');
    }
  } catch {}
})();

export function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}
