import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voidhopper.game',
  appName: 'Void Hopper',
  webDir: 'build',
  server: {
    // Allow AdMob network requests
    allowNavigation: ['*.google.com', '*.googleapis.com', '*.doubleclick.net', '*.googleadservices.com'],
  },
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Void Hopper',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#120e29',
    },
  },
  android: {
    backgroundColor: '#120e29',
  },
};

export default config;
