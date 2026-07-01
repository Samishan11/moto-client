import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthResult, AuthTokens, UserPublic } from '@moto/contract';
import { configureAuthBridge, setAccessToken } from '../api/client';
import { queryClient } from '../api/queryClient';
import { meQueryOptions, queryKeys } from '../api/queries';
import {
  clearRefreshToken,
  getStoredRefreshToken,
  saveRefreshToken,
} from './storage';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: UserPublic | null;
  /** Persist tokens + seed the `me` cache after register/login. */
  applySession(result: AuthResult): Promise<void>;
  /** Clear tokens + drop the `me` cache (logout / session expiry). */
  clearSession(): Promise<void>;
  /** Re-fetch `/auth/me` (e.g. after email verification flips `emailVerified`). */
  reloadUser(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserPublic | null>(null);

  const applySession = useCallback(async (result: AuthResult) => {
    setAccessToken(result.tokens.accessToken);
    await saveRefreshToken(result.tokens.refreshToken);
    queryClient.setQueryData(queryKeys.me, result.user);
    setUser(result.user);
    setStatus('signedIn');
  }, []);

  const clearSession = useCallback(async () => {
    setAccessToken(null);
    await clearRefreshToken();
    queryClient.removeQueries({ queryKey: queryKeys.me });
    setUser(null);
    setStatus('signedOut');
  }, []);

  const reloadUser = useCallback(async () => {
    const me = await queryClient.fetchQuery(meQueryOptions);
    setUser(me);
  }, []);

  // Bridge so the API client can rotate the refresh token / expire the session.
  // This configures once at mount. clearSession is stable (useCallback with []), so we don't
  // need it in the dependency array.
  useEffect(() => {
    configureAuthBridge({
      getRefreshToken: () => getStoredRefreshToken(),
      onTokensRefreshed: async (tokens: AuthTokens) => {
        await saveRefreshToken(tokens.refreshToken);
      },
      onSessionExpired: async () => {
        await clearSession();
      },
    });
    return () => configureAuthBridge(null);
  }, []);

  // Cold-start session restore: if a refresh token exists, `meQueryOptions`'
  // fetch 401s with a null access token, the client refreshes transparently,
  // and we land signed in. No (or rejected) refresh token → signed out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshToken = await getStoredRefreshToken();
        console.log('[AuthContext] Cold-start: refresh token exists?', !!refreshToken);

        if (!refreshToken) {
          console.log('[AuthContext] No refresh token, signing out');
          if (!cancelled) setStatus('signedOut');
          return;
        }

        console.log('[AuthContext] Attempting to restore session...');
        const me = await queryClient.fetchQuery(meQueryOptions);

        if (!cancelled) {
          console.log('[AuthContext] Session restored, user:', me.id);
          setUser(me);
          setStatus('signedIn');
        }
      } catch (error) {
        console.error('[AuthContext] Session restore failed:', error instanceof Error ? error.message : error);
        if (!cancelled) {
          // Directly clear without depending on clearSession callback to avoid
          // re-running this effect when status changes
          setAccessToken(null);
          await clearRefreshToken();
          queryClient.removeQueries({ queryKey: queryKeys.me });
          setUser(null);
          setStatus('signedOut');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, applySession, clearSession, reloadUser }),
    [status, user, applySession, clearSession, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
