import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import ErrorBoundary from './components/ErrorBoundary';
import Game from './components/Game';
import { initializeAds, showBanner } from './AdManager';
import './App.css';

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Hide status bar for fullscreen game experience
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.hide().catch(() => {});
      });

      // Lock to portrait
      import('@capacitor/screen-orientation').then(({ ScreenOrientation }) => {
        ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
      });

      // Hide splash screen once app is ready
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        SplashScreen.hide().catch(() => {});
      });

      // Initialize AdMob and show banner ad
      initializeAds().then(() => showBanner());
    }
  }, []);

  return (
    <div className="App">
      <ErrorBoundary>
        <Game />
      </ErrorBoundary>
    </div>
  );
}

export default App;
