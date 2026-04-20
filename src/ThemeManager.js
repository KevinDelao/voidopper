const THEMES = {
  default: {
    name: 'Deep Space',
    bgTint: null,
    particleColor: null,
    edgeGlow: null,
  },
  aurora: {
    name: 'Aurora Borealis',
    bgTint: 'rgba(0, 40, 30, 0.15)',
    particleColor: '#44ffaa',
    edgeGlow: '#22ff88',
  },
  crimson: {
    name: 'Crimson Nebula',
    bgTint: 'rgba(40, 0, 10, 0.12)',
    particleColor: '#ff6666',
    edgeGlow: '#ff3344',
  },
  cosmic: {
    name: 'Cosmic Ocean',
    bgTint: 'rgba(0, 15, 40, 0.15)',
    particleColor: '#6688ff',
    edgeGlow: '#4466ee',
  },
  golden: {
    name: 'Solar Flare',
    bgTint: 'rgba(30, 20, 0, 0.12)',
    particleColor: '#ffcc44',
    edgeGlow: '#ffaa00',
  },
  void: {
    name: 'Void Pulse',
    bgTint: 'rgba(20, 0, 30, 0.15)',
    particleColor: '#cc44ff',
    edgeGlow: '#aa22ee',
  },
};

const THEME_KEYS = Object.keys(THEMES);

class ThemeManager {
  constructor() {
    this._cachedTheme = null;
    this._cachedDay = null;
  }

  getCurrentTheme() {
    const today = new Date().toDateString();
    if (this._cachedDay === today && this._cachedTheme) return this._cachedTheme;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const idx = dayOfYear % THEME_KEYS.length;
    this._cachedTheme = THEMES[THEME_KEYS[idx]];
    this._cachedDay = today;
    return this._cachedTheme;
  }

  getThemeByKey(key) {
    return THEMES[key] || THEMES.default;
  }

  getAllThemes() {
    return THEMES;
  }
}

export default ThemeManager;
