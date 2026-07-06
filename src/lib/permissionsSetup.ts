import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * One-time "Set up your ride" onboarding flag. Device-level (OS permissions
 * are per-device, not per-account), so it lives outside auth storage. Same
 * SecureStore-with-localStorage-web-fallback pattern as auth/storage.ts.
 */
const SETUP_KEY = 'moto.permissionsSetupDone';

const isWeb = Platform.OS === 'web';

export async function isPermissionsSetupDone(): Promise<boolean> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(SETUP_KEY) === '1';
    return (await SecureStore.getItemAsync(SETUP_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markPermissionsSetupDone(): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.setItem(SETUP_KEY, '1');
      return;
    }
    await SecureStore.setItemAsync(SETUP_KEY, '1');
  } catch {
    // Non-fatal: worst case the screen shows again next cold start.
  }
}
