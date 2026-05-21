import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  super_rare: 'Super Raro',
  legendary: 'Lendário',
};

export function formatRarity(value?: string | null) {
  if (!value) return '—';
  return RARITY_LABELS[value] ?? value.replaceAll('_', ' ');
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
