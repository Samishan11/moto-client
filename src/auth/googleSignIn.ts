import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useGoogleLogin } from './mutations';

// Completes the pending auth session when the browser redirects back into the
// app (no-op on native cold paths; required for web and some Android flows).
WebBrowser.maybeCompleteAuthSession();

/**
 * OAuth client IDs from the Google Cloud project. Set in .env / eas.json as
 * EXPO_PUBLIC_* so they're inlined at build time. All three may point at the
 * same project; iOS/Android are used by native builds, web by Expo Go + web.
 */
const CLIENT_IDS = {
  clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

/**
 * "Continue with Google" flow: opens the Google account chooser, receives an
 * ID token, and exchanges it at POST /auth/google for a normal Moto session
 * (same `applySession` path as email login).
 */
export function useGoogleSignIn() {
  const login = useGoogleLogin();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(CLIENT_IDS);

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      login.mutate(response.params.id_token);
    }
    // login.mutate is stable (React Query); depending on `login` would re-fire
    // the exchange on every mutation state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return {
    /** False until the auth request is ready or when no client ID is configured. */
    ready: request != null,
    /** True while the browser flow or the token exchange is in flight. */
    isPending: login.isPending,
    error: login.error,
    signIn: () => promptAsync(),
  };
}
