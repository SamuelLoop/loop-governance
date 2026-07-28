import type { Tier } from '../types';

export function rankToTier(rank: number): Tier {
  if (rank >= 0.99) return 'diamond';
  if (rank >= 0.95) return 'platinum';
  if (rank >= 0.85) return 'gold';
  if (rank >= 0.65) return 'silver';
  return 'bronze';
}

export const tierColors: Record<Tier, string> = {
  diamond: '#b9f2ff',
  platinum: '#e5e4e2',
  gold: '#f59e0b',
  silver: '#94a3b8',
  bronze: '#cd7f32',
};

export const tierRingWidth: Record<Tier, number> = {
  diamond: 2,
  platinum: 2,
  gold: 2,
  silver: 1,
  bronze: 1,
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
