import { client } from '@/js/lib/api';

export const WORKOUT_REACTION_EMOJIS = ['🔥', '💪', '👏', '❤️', '😂', '😮', '👎'] as const;
export type WorkoutReactionEmoji = (typeof WORKOUT_REACTION_EMOJIS)[number];

export type WorkoutReactionsSummary = {
  counts: Record<string, number>;
  my_reactions: string[];
  total: number;
};

export type WorkoutCommentDto = {
  id: number;
  workout: number;
  body: string;
  user_id: number;
  user_display_name: string;
  user_trainer_sprite?: string | null;
  created: string;
};

export type WorkoutInteractionsDto = {
  reactions: WorkoutReactionsSummary;
  comments: WorkoutCommentDto[];
  supported_emojis: string[];
};

export type InteractionsNotificationDto = {
  count: number;
  last_seen_at: string | null;
};

export async function fetchWorkoutInteractions(workoutId: number) {
  const response = await client.instance.get<WorkoutInteractionsDto>(
    `/api/workouts/${workoutId}/interactions/`,
  );
  return response.data;
}

export async function toggleWorkoutReaction(workoutId: number, emoji: string) {
  const response = await client.instance.post<WorkoutInteractionsDto>(
    `/api/workouts/${workoutId}/react/`,
    { emoji },
  );
  return response.data;
}

export async function postWorkoutComment(workoutId: number, body: string) {
  const response = await client.instance.post<WorkoutCommentDto>(
    `/api/workouts/${workoutId}/comments/`,
    { body },
  );
  return response.data;
}

export async function deleteWorkoutComment(workoutId: number, commentId: number) {
  await client.instance.delete(`/api/workouts/${workoutId}/comments/${commentId}/`);
}

export async function fetchInteractionsNotifications() {
  const response = await client.instance.get<InteractionsNotificationDto>(
    '/api/workouts/interactions-notifications/',
  );
  return response.data;
}

export async function markInteractionsSeen() {
  const response = await client.instance.post<InteractionsNotificationDto>(
    '/api/workouts/interactions-notifications/mark-seen/',
  );
  return response.data;
}
