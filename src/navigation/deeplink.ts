import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

/**
 * Auth deep links. The backend's verification/reset emails link to:
 *   moto://verify-email?token=...
 *   moto://reset-password?token=...
 * Opening either launches the app here; screens prefill the token and can
 * auto-submit. Manual token entry (copy from Mailpit in dev) remains supported.
 */
export type AuthDeepLink =
  | { kind: 'verify-email'; token: string }
  | { kind: 'reset-password'; token: string };

function parse(url: string | null): AuthDeepLink | null {
  if (!url) return null;
  const { path, hostname, queryParams } = Linking.parse(url);
  // Depending on the scheme/url form the route can land in path or hostname.
  const route = (path ?? hostname ?? '').replace(/^\/+/, '');
  const token = queryParams?.token;
  if (typeof token !== 'string' || token.length === 0) return null;
  if (route === 'verify-email') return { kind: 'verify-email', token };
  if (route === 'reset-password') return { kind: 'reset-password', token };
  return null;
}

/**
 * Resolves the deep link the app was opened with (cold start) and any links
 * received while running. Returns `undefined` until the initial URL is checked.
 */
export function useAuthDeepLink(): AuthDeepLink | null | undefined {
  const [link, setLink] = useState<AuthDeepLink | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    Linking.getInitialURL().then((url) => {
      if (active) setLink(parse(url));
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = parse(url);
      if (parsed) setLink(parsed);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return link;
}
