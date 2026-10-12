/**
 * True when the app runs inside the Capacitor Android shell instead of a normal browser.
 * The native bridge injects `window.Capacitor`; in a browser it is undefined.
 */
export function isNativeApp(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

/** Android package id — must match FE/capacitor.config.json "appId". */
export const ANDROID_APP_ID = 'vn.dynforge.app';

/** Custom URL scheme registered in AndroidManifest.xml to bring the buyer back after paying. */
export const APP_SCHEME = 'dynforge';
