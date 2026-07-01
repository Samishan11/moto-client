import Constants from 'expo-constants';

const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '3000';

/**
 * Resolves the backend base URL.
 *
 * Priority:
 * 1. `EXPO_PUBLIC_API_URL` if set — explicit override for staging/prod.
 * 2. In dev, the Metro bundler's host with the API port. This is the machine
 *    running `expo start`, so it works from a physical device, an iOS
 *    simulator, and an Android emulator alike — `localhost` would otherwise
 *    resolve to the device itself and the request would hang.
 * 3. `localhost` as a last resort.
 */
function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit;

  // e.g. "192.168.1.66:8081" — the dev server's LAN host:port.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Older/Expo Go shapes:
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${DEFAULT_API_PORT}`;

  return `http://localhost:${DEFAULT_API_PORT}`;
}

export const API_URL = resolveApiUrl();

if (__DEV__) {
  // Surfaces the resolved backend host in the Metro logs so connectivity issues
  // (localhost vs LAN IP vs tunnel) are obvious at a glance.
  console.log(`[api] base URL → ${API_URL}`);
}
