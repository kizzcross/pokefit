import { client } from '@/js/lib/api';

export type CalendarDayWorkout = {
  id: number;
  workout_type: string;
  total_volume: string;
  perceived_effort?: number | null;
  proof_photo_url?: string | null;
  proof_caption?: string;
  encounter_status?: string;
  encounter_species_name?: string | null;
  encounter_species_sprite?: string | null;
  encounter_species_pokedex_id?: number | null;
};

export type CalendarDay = {
  date: string;
  workout_count: number;
  has_capture: boolean;
  has_shiny: boolean;
  has_draft: boolean;
  workouts: CalendarDayWorkout[];
};

export type CalendarMonth = {
  year: number;
  month: number;
  days_in_month: number;
  streak_current: number;
  streak_best_all_time: number;
  streak_best_in_month: number;
  days_trained: number;
  days: CalendarDay[];
  user?: {
    id: number;
    display_name: string;
    trainer_sprite?: string;
    trainer_sprite_url?: string | null;
  };
};

export async function fetchMyCalendar(year: number, month: number) {
  const response = await client.instance.get<CalendarMonth>('/api/workouts/calendar/', {
    params: { year, month },
  });
  return response.data;
}

export async function fetchUserCalendar(userId: number, year: number, month: number) {
  const response = await client.instance.get<CalendarMonth>(`/api/users/${userId}/calendar/`, {
    params: { year, month },
  });
  return response.data;
}

export const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function localDateIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const emptyDay = (date: string): CalendarDay => ({
  date,
  workout_count: 0,
  has_capture: false,
  has_shiny: false,
  has_draft: false,
  workouts: [],
});

/** Monta o grid 7 colunas sempre, mesmo sem resposta da API ainda. */
export function buildMonthGrid(
  year: number,
  month: number,
  daysFromApi?: CalendarDay[] | null,
): (CalendarDay | null)[] {
  const totalDays = daysInMonth(year, month);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const lookup = new Map((daysFromApi ?? []).map((day) => [day.date, day]));

  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let dayNum = 1; dayNum <= totalDays; dayNum += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    cells.push(lookup.get(date) ?? emptyDay(date));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
