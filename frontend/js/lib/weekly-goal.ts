import { client } from '@/js/lib/api';

export type WeeklyGoalStatus = {
  has_active_goal: boolean;
  target: number | null;
  suggested_target: number;
  current: number;
  hp_current: number;
  hp_max: number;
  week_start: string;
  week_end: string;
  iso_year: number;
  iso_week: number;
  progress_percent: number;
  goal_met: boolean;
  reward_claimed: boolean;
  reward_workout_id: number | null;
  pending_legendary_encounter: boolean;
  goal_locked: boolean;
};

export async function fetchWeeklyGoal() {
  const response = await client.instance.get<WeeklyGoalStatus>('/api/weekly-goal/');
  return response.data;
}

export async function saveWeeklyGoal(target: number) {
  const response = await client.instance.post<WeeklyGoalStatus>('/api/weekly-goal/', {
    target,
  });
  return response.data;
}
