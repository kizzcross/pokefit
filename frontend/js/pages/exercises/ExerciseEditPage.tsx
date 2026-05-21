import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { exercisesRetrieve } from '@/js/api';
import StaffGuard from '@/js/app/StaffGuard';
import ExerciseForm, { type ExerciseFormInitialValues } from '@/js/components/exercises/ExerciseForm';
import MobileHeader from '@/js/components/layout/MobileHeader';
import { PageLoading } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { updateExercise } from '@/js/lib/exercises';

const ExerciseEditPage = () => {
  const { id } = useParams();
  const exerciseId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: exercise, isPending, isError } = useQuery({
    queryKey: ['exercises', exerciseId],
    queryFn: async () => (await exercisesRetrieve({ path: { id: exerciseId } })).data,
    enabled: Number.isFinite(exerciseId),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateExercise>[1]) => updateExercise(exerciseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      navigate('/exercises', { state: { exerciseUpdated: true } });
    },
    onError: () => {
      setError('Não foi possível salvar. Verifique os campos e sua permissão de admin.');
    },
  });

  const initialValues: ExerciseFormInitialValues | undefined = exercise
    ? {
        name: exercise.name ?? '',
        description: exercise.description ?? '',
        instructions: exercise.instructions ?? '',
        muscle_group: exercise.muscle_group ?? 'legs',
        difficulty: exercise.difficulty ?? 'beginner',
        equipment: exercise.equipment ?? '',
        video_url: exercise.video_url ?? '',
        is_active: exercise.is_active ?? true,
        image_url: exercise.image_url ?? null,
      }
    : undefined;

  return (
    <StaffGuard>
      <MobileHeader backTo="/exercises" title="Editar exercício" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        {isPending ? (
          <PageLoading label="Carregando exercício..." />
        ) : isError || !exercise ? (
          <PixelCard>
            <p className="text-sm text-[var(--color-game-danger)]">Exercício não encontrado.</p>
          </PixelCard>
        ) : (
          <ExerciseForm
            key={exercise.id}
            error={error}
            initialValues={initialValues}
            isSubmitting={updateMutation.isPending}
            mode="edit"
            onSubmit={(payload) => {
              setError(null);
              updateMutation.mutate(payload);
            }}
          />
        )}
      </main>
    </StaffGuard>
  );
};

export default ExerciseEditPage;
