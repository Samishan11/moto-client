import type { TFunction } from 'i18next';
import { ApiError } from './client';

/**
 * Resolves any thrown value to a user-facing string. For `ApiError` we prefer
 * the localized `messageKey` from the contract's error envelope, then the
 * server's English fallback, then a generic message.
 */
export function errorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    const localized = t(err.messageKey, { defaultValue: '' });
    if (localized) return localized;
    if (err.message) return err.message;
    return t('errors.unknown');
  }
  // A failed fetch (server unreachable, wrong host, offline) throws a TypeError
  // like "Network request failed" — surface that distinctly from a real bug.
  if (err instanceof TypeError || (err instanceof Error && /network/i.test(err.message))) {
    return t('errors.network');
  }
  return t('errors.unknown');
}
