import { Capacitor } from '@capacitor/core';

let admobModule = null;
let bannerVisible = false;

// Replace these with your real AdMob unit IDs before publishing
// TODO: Replace XXXXXXXXXX with your actual ad unit suffixes from AdMob
const AD_UNIT_IDS = {
  ios: 'ca-app-pub-9488448873943026/XXXXXXXXXX',      // Replace with iOS banner unit ID
  android: 'ca-app-pub-9488448873943026/XXXXXXXXXX',   // Replace with Android banner unit ID
};

async function getAdMob() {
  if (!admobModule) {
    admobModule = await import('@capacitor-community/admob');
  }
  return admobModule;
}

export async function initializeAds() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { AdMob } = await getAdMob();
    await AdMob.initialize({
      initializeForTesting: true, // Remove this for production
    });
  } catch (e) {
    console.warn('AdMob init failed:', e);
  }
}

export async function showBanner() {
  if (!Capacitor.isNativePlatform() || bannerVisible) return;

  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = await getAdMob();
    const adId = Capacitor.getPlatform() === 'ios' ? AD_UNIT_IDS.ios : AD_UNIT_IDS.android;

    await AdMob.showBanner({
      adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: true, // Remove this for production
    });
    bannerVisible = true;
  } catch (e) {
    console.warn('Banner show failed:', e);
  }
}

export async function hideBanner() {
  if (!Capacitor.isNativePlatform() || !bannerVisible) return;

  try {
    const { AdMob } = await getAdMob();
    await AdMob.hideBanner();
    bannerVisible = false;
  } catch (e) {
    console.warn('Banner hide failed:', e);
  }
}

export function isBannerVisible() {
  return bannerVisible;
}

// Standard banner height is ~50pt on phones, ~90pt on tablets
export function getBannerHeight() {
  if (!Capacitor.isNativePlatform() || !bannerVisible) return 0;
  const isTablet = /iPad/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isTablet ? 90 : 50;
}
