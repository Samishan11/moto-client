/** Moto design tokens - dark theme with orange accent */
export const colors = {
  // Moto Colors
  primary: '#FF5A1F',      // Orange
  secondary: '#2E8BFF',    // Blue
  success: '#30D158',      // Green
  danger: '#FF453A',       // Red
  warning: '#FFD60A',      // Yellow

  // Text & Background
  dark: '#0A0B0D',         // Dark background
  surface: '#15171C',      // Surface/card background
  text: '#F2F3F5',         // Primary text (light)
  muted: '#9AA0AB',        // Secondary text (muted)
  faint: '#6B7280',        // Tertiary text: section labels, hints, chevrons
  border: '#6B7280',       // Border color (legacy — inputs use fieldBorder)
  fieldBorder: 'rgba(255,255,255,0.09)', // Canonical input/card hairline (design file)
  fieldBorderFocus: 'rgba(255,90,31,0.4)', // Input focus ring (design file)

  // Legacy compatibility
  primaryText: '#ffffff',
  bg: '#0A0B0D',
  fieldBg: '#15171C',
  error: '#FF453A',
  warningBg: 'rgba(255, 214, 10, 0.1)',
};

export const spacing = (n: number): number => n * 8;
