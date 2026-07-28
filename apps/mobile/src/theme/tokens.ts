export const colors = {
  bg: {
    primary: '#090909',
    elevated: '#111111',
    card: '#161616',
    overlay: 'rgba(0,0,0,0.72)',
  },
  tier: {
    diamond: '#b9f2ff',
    platinum: '#e5e4e2',
    gold: '#f59e0b',
    silver: '#94a3b8',
    bronze: '#cd7f32',
  },
  text: {
    primary: 'rgba(235,235,235,0.92)',
    secondary: 'rgba(180,180,180,0.70)',
    muted: 'rgba(100,100,100,0.60)',
  },
  border: 'rgba(255,255,255,0.08)',
  success: '#22c55e',
  error: '#ef4444',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  hero: 34,
} as const;
