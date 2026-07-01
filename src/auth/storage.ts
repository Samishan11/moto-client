import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Refresh-token persistence.
 *
 * The refresh token is the only secret we persist: the access token lives in
 * memory only (see api/client.ts). On native we use the Keychain/Keystore via
 * expo-secure-store; on web (react-native-web) SecureStore is unavailable, so
 * we fall back to localStorage purely so the dev web target doesn't crash.
 */
const REFRESH_KEY = 'moto.refreshToken';

const isWeb = Platform.OS === 'web';

export async function saveRefreshToken(token: string): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.setItem(REFRESH_KEY, token);
      console.log('[storage] Saved refresh token to localStorage');
      return;
    }
    await SecureStore.setItemAsync(REFRESH_KEY, token);
    console.log('[storage] Saved refresh token to secure store');
  } catch (error) {
    console.error('[storage] Failed to save refresh token:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) {
      const token = globalThis.localStorage?.getItem(REFRESH_KEY) ?? null;
      console.log('[storage] Retrieved refresh token from localStorage:', !!token);
      return token;
    }
    const token = await SecureStore.getItemAsync(REFRESH_KEY);
    console.log('[storage] Retrieved refresh token from secure store:', !!token);
    return token;
  } catch (error) {
    console.error('[storage] Failed to retrieve refresh token:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(REFRESH_KEY);
      console.log('[storage] Cleared refresh token from localStorage');
      return;
    }
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    console.log('[storage] Cleared refresh token from secure store');
  } catch (error) {
    console.error('[storage] Failed to clear refresh token:', error instanceof Error ? error.message : error);
  }
}
