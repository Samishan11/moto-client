/**
 * Lightweight client-side strength hint. This is *guidance only* — the backend
 * is the source of truth (it runs a zxcvbn check ≥ 3). We deliberately avoid
 * bundling zxcvbn (~400kb) on the client.
 */
export type Strength = 0 | 1 | 2 | 3;

export function passwordStrength(pw: string): Strength {
  if (pw.length < 8) return 0;
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(3, score) as Strength;
}

export const strengthKey: Record<Strength, string> = {
  0: 'register.strength.weak',
  1: 'register.strength.fair',
  2: 'register.strength.good',
  3: 'register.strength.strong',
};
