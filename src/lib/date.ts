/** Date helpers for the Phase 2 forms. Dates are stored as ISO-8601 at UTC
 * midnight so the calendar day never shifts across time zones. */

/** ISO string → "YYYY-MM-DD" for display/prefill. */
export function fromIsoDate(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

/** A `Date` (from the picker, in local time) → ISO at UTC midnight of that day. */
export function dateToIsoDay(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

/** ISO string → a local `Date` at that calendar day (for seeding the picker). */
export function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
