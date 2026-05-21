import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { workoutsCreate } from '@/js/api';

const workoutTypes = [
  { value: 'chest_triceps', label: 'Peito + Tríceps' },
  { value: 'back_biceps', label: 'Costas + Bíceps' },
  { value: 'legs', label: 'Pernas' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'arms', label: 'Braços' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'full_body', label: 'Corpo inteiro' },
  { value: 'mobility', label: 'Mobilidade' },
];

const WorkoutNewPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (workout_type: string) => {
      const response = await workoutsCreate({
        body: { workout_type: workout_type as never, started_at: new Date().toISOString() },
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: (workout) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'active-draft'] });
      navigate(`/workout/${workout.id}`);
    },
  });

  return (
    <>
      <MobileHeader backTo="/" title="Novo treino" />
      <main className="space-y-3 px-4 pb-28 pt-4">
        <PixelCard className="border-[var(--color-game-info)]">
          <p className="text-sm text-[var(--color-game-muted)]">
            Escolha o foco do treino. Só existe <strong className="text-[var(--color-game-text)]">um treino ativo</strong>{' '}
            por vez — se você tinha um rascunho aberto, ele será descartado ao iniciar este.
          </p>
        </PixelCard>
        <div className="grid gap-3">
          {workoutTypes.map((type) => (
            <PixelButton
              key={type.value}
              disabled={createMutation.isPending}
              fullWidth
              onClick={() => createMutation.mutate(type.value)}
              variant="secondary"
            >
              {type.label}
            </PixelButton>
          ))}
        </div>
      </main>
    </>
  );
};

export default WorkoutNewPage;
