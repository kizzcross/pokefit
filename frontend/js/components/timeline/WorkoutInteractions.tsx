import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import { userProfilePath } from '@/js/components/social/UserLink';
import { useAuth } from '@/js/hooks/useAuth';
import {
  WORKOUT_REACTION_EMOJIS,
  deleteWorkoutComment,
  fetchWorkoutInteractions,
  postWorkoutComment,
  toggleWorkoutReaction,
  type WorkoutInteractionsDto,
} from '@/js/lib/interactions';
import { cn } from '@/js/lib/utils';

type Props = {
  workoutId: number;
};

const formatRelative = (iso: string) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const interactionsQueryKey = (workoutId: number) => ['workouts', 'interactions', workoutId];

const WorkoutInteractions = ({ workoutId }: Props) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery({
    queryKey: interactionsQueryKey(workoutId),
    queryFn: () => fetchWorkoutInteractions(workoutId),
  });

  const reactMutation = useMutation({
    mutationFn: (emoji: string) => toggleWorkoutReaction(workoutId, emoji),
    onSuccess: (next) => {
      queryClient.setQueryData<WorkoutInteractionsDto>(interactionsQueryKey(workoutId), next);
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'interactions'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => postWorkoutComment(workoutId, body),
    onSuccess: (newComment) => {
      queryClient.setQueryData<WorkoutInteractionsDto | undefined>(
        interactionsQueryKey(workoutId),
        (prev) =>
          prev ? { ...prev, comments: [...prev.comments, newComment] } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'interactions'] });
      setDraft('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteWorkoutComment(workoutId, commentId),
    onSuccess: (_v, commentId) => {
      queryClient.setQueryData<WorkoutInteractionsDto | undefined>(
        interactionsQueryKey(workoutId),
        (prev) =>
          prev
            ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) }
            : prev,
      );
    },
  });

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  const reactions = data?.reactions;
  const comments = data?.comments ?? [];
  const myEmoji = reactions?.my_reactions?.[0] ?? null;
  const usedEmojis = WORKOUT_REACTION_EMOJIS.filter(
    (emoji) => (reactions?.counts?.[emoji] ?? 0) > 0,
  );

  const handleEmojiClick = (emoji: string) => {
    setPickerOpen(false);
    reactMutation.mutate(emoji);
  };

  const handleSubmitComment = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    commentMutation.mutate(trimmed);
  };

  return (
    <div className="mt-2 space-y-2 text-xs">
      <div className="relative flex flex-wrap items-center gap-1">
        {usedEmojis.map((emoji) => {
          const count = reactions?.counts?.[emoji] ?? 0;
          const isMine = myEmoji === emoji;
          return (
            <button
              key={emoji}
              aria-pressed={isMine}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 leading-none transition',
                isMine
                  ? 'border-[var(--color-game-accent)] bg-[var(--color-game-accent)]/15 text-[var(--color-game-text)]'
                  : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)]/40 text-[var(--color-game-muted)] hover:border-[var(--color-game-accent)]',
              )}
              disabled={reactMutation.isPending}
              onClick={() => handleEmojiClick(emoji)}
              type="button"
            >
              <span className="text-[13px]">{emoji}</span>
              {count > 0 ? <span className="text-[10px] font-semibold">{count}</span> : null}
            </button>
          );
        })}

        <div ref={pickerRef} className="relative">
          <button
            aria-label="Reagir"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-base leading-none text-[var(--color-game-muted)] transition hover:bg-[var(--color-game-bg-light)] hover:text-[var(--color-game-accent)]"
            onClick={() => setPickerOpen((value) => !value)}
            type="button"
          >
            ☺
          </button>
          {pickerOpen ? (
            <div
              className="absolute left-0 top-7 z-10 flex items-center gap-1 rounded-full border-2 border-[var(--color-game-border)] bg-[var(--color-game-panel)] px-2 py-1 shadow-[2px_2px_0_0_var(--color-game-border)]"
              role="menu"
            >
              {WORKOUT_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  aria-pressed={myEmoji === emoji}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-110',
                    myEmoji === emoji ? 'bg-[var(--color-game-accent)]/20' : 'hover:bg-[var(--color-game-bg-light)]',
                  )}
                  onClick={() => handleEmojiClick(emoji)}
                  type="button"
                >
                  <span className="text-base leading-none">{emoji}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[var(--color-game-muted)]">
          <button
            className="hover:text-[var(--color-game-info)]"
            onClick={() => setCommentsOpen((value) => !value)}
            type="button"
          >
            {comments.length > 0
              ? `${commentsOpen ? 'Ocultar' : 'Ver'} ${comments.length} coment${
                  comments.length === 1 ? 'ário' : 'ários'
                }`
              : 'Comentar'}
          </button>
        </div>
      </div>

      {commentsOpen ? (
        <div className="space-y-2.5">
          {comments.length > 0 ? (
            <ul className="space-y-2">
              {comments.map((comment) => {
                const canDelete =
                  !!user && (user.id === comment.user_id || user.is_staff === true);
                return (
                  <li key={comment.id} className="group flex items-start gap-2">
                    <a
                      aria-label={`Perfil de ${comment.user_display_name}`}
                      className="shrink-0"
                      href={userProfilePath(comment.user_id)}
                    >
                      <TrainerAvatar
                        alt={comment.user_display_name}
                        size="xs"
                        slug={comment.user_trainer_sprite ?? undefined}
                      />
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="break-words leading-snug">
                        <a
                          className="font-semibold text-[var(--color-game-text)] no-underline hover:underline"
                          href={userProfilePath(comment.user_id)}
                        >
                          {comment.user_display_name}
                        </a>{' '}
                        <span>{comment.body}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-game-muted)]">
                        {formatRelative(comment.created)}
                      </p>
                    </div>
                    {canDelete ? (
                      <button
                        aria-label="Apagar comentário"
                        className="shrink-0 self-start p-1 text-[var(--color-game-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--color-game-danger)] focus-visible:opacity-100"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(comment.id)}
                        type="button"
                      >
                        ✕
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmitComment();
            }}
          >
            {user ? (
              <TrainerAvatar
                alt={user.display_name ?? user.email}
                size="xs"
                slug={user.trainer_sprite}
                src={user.trainer_sprite_url}
              />
            ) : null}
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-1 focus-within:border-[var(--color-game-accent)]">
              <input
                aria-label="Escrever comentário"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--color-game-muted)]"
                maxLength={500}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Adicione um comentário..."
                type="text"
                value={draft}
              />
              <button
                aria-label="Enviar comentário"
                className={cn(
                  'shrink-0 text-[11px] font-bold uppercase transition',
                  draft.trim().length === 0 || commentMutation.isPending
                    ? 'pointer-events-none text-[var(--color-game-muted)]'
                    : 'text-[var(--color-game-info)] hover:text-[var(--color-game-accent)]',
                )}
                disabled={commentMutation.isPending || draft.trim().length === 0}
                type="submit"
              >
                Enviar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default WorkoutInteractions;
