import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import StaffGuard from '@/js/app/StaffGuard';
import ExerciseForm from '@/js/components/exercises/ExerciseForm';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelCard from '@/js/components/ui/PixelCard';
import { createExercise } from '@/js/lib/exercises';

const ExerciseCreatePage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      navigate('/exercises', { state: { exerciseCreated: true } });
    },
    onError: () => {
      setError('Não foi possível salvar. Confira os campos e se sua conta é de administrador.');
    },
  });

  return (
    <StaffGuard>
      <MobileHeader backTo="/exercises" subtitle="Catálogo global" title="Novo exercício" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <PixelCard>
          <p className="text-game-body text-sm text-[var(--color-game-muted)]">
            Cadastre exercícios com foto e instruções. Eles entram no catálogo usado ao montar treinos.
          </p>
        </PixelCard>

        <ExerciseForm
          error={error}
          isSubmitting={createMutation.isPending}
          onSubmit={(payload) => {
            setError(null);
            createMutation.mutate(payload);
          }}
        />
      </main>
    </StaffGuard>
  );
};

export default ExerciseCreatePage;
