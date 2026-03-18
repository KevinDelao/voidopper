import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// One-time migration from old localStorage keys
try {
  if (!localStorage.getItem('voidHopper_migrated')) {
    const keys = ['highScores', 'highCoinScores', 'muted', 'totalCoins',
      'selectedSkin', 'unlockedSkins', 'selectedTrail', 'unlockedTrails',
      'graphics', 'progression'];
    const oldPrefixes = ['spaceClimber_', 'starHopper_'];
    keys.forEach(k => {
      if (localStorage.getItem('voidHopper_' + k) != null) return;
      for (const prefix of oldPrefixes) {
        const old = localStorage.getItem(prefix + k);
        if (old != null) {
          localStorage.setItem('voidHopper_' + k, old);
          break;
        }
      }
    });
    localStorage.setItem('voidHopper_migrated', '1');
  }
} catch {
  // localStorage unavailable — skip migration
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
