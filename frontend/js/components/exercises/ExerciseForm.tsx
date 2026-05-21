import { DragEvent, FormEvent, useEffect, useId, useRef, useState } from 'react';

import GameIcon from '@/js/components/game/GameIcon';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { type ExerciseFormPayload } from '@/js/lib/exercises';
import { cn } from '@/js/lib/utils';

const muscleGroups = [
  { value: 'chest', label: 'Peito' },
  { value: 'back', label: 'Costas' },
  { value: 'legs', label: 'Pernas' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'arms', label: 'Braços' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'full_body', label: 'Corpo inteiro' },
  { value: 'mobility', label: 'Mobilidade' },
];

const difficulties = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
];

const fieldClass =
  'w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 text-sm outline-none transition focus:border-[var(--color-game-accent)]';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ExerciseFormInitialValues = ExerciseFormPayload & {
  image_url?: string | null;
};

type ExerciseFormProps = {
  isSubmitting?: boolean;
  error?: string | null;
  mode?: 'create' | 'edit';
  initialValues?: ExerciseFormInitialValues;
  submitLabel?: string;
  onSubmit: (payload: ExerciseFormPayload) => void;
};

const ExerciseForm = ({
  isSubmitting = false,
  error,
  mode = 'create',
  initialValues,
  submitLabel,
  onSubmit,
}: ExerciseFormProps) => {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('legs');
  const [difficulty, setDifficulty] = useState('beginner');
  const [equipment, setEquipment] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    setName(initialValues.name);
    setDescription(initialValues.description ?? '');
    setInstructions(initialValues.instructions ?? '');
    setMuscleGroup(initialValues.muscle_group);
    setDifficulty(initialValues.difficulty);
    setEquipment(initialValues.equipment ?? '');
    setVideoUrl(initialValues.video_url ?? '');
    setIsActive(initialValues.is_active ?? true);
    setImage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(initialValues.image_url ?? null);
  }, [initialValues]);

  const applyImage = (file: File | null) => {
    setImageError(null);
    if (!file) {
      setImage(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setImageError('Use PNG, JPG ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Imagem muito grande (máx. 5 MB).');
      return;
    }

    setImage(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    applyImage(event.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      muscle_group: muscleGroup,
      difficulty,
      equipment: equipment.trim(),
      video_url: videoUrl.trim(),
      image,
      is_active: isActive,
    });
  };

  return (
    <form className="space-y-4" id={formId} onSubmit={handleSubmit}>
      <PixelCard className="space-y-3 border-[var(--color-game-info)]">
        <div className="flex items-center gap-2">
          <GameIcon className="text-[var(--color-game-info)]" name="workout" size={22} />
          <h2 className="text-game-title text-[var(--color-game-info)]">Imagem</h2>
        </div>
        <p className="text-game-muted text-xs">
          Foto ou ilustração do movimento. Aparece no catálogo ao montar treinos.
        </p>

        <div
          className={cn(
            'relative flex min-h-48 flex-col items-center justify-center gap-2 rounded-sm border-4 border-dashed px-4 py-6 text-center transition',
            isDragging
              ? 'border-[var(--color-game-accent)] bg-[var(--color-game-panel)]'
              : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)]',
            preview ? 'p-2' : 'cursor-pointer hover:border-[var(--color-game-accent)]',
          )}
          onClick={() => {
            if (!preview) fileInputRef.current?.click();
          }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => applyImage(event.target.files?.[0] ?? null)}
            ref={fileInputRef}
            type="file"
          />

          {preview ? (
            <>
              <img
                alt="Prévia do exercício"
                className="max-h-52 w-full object-contain"
                src={preview}
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <PixelButton
                  type="button"
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Trocar imagem
                </PixelButton>
                <PixelButton
                  type="button"
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    applyImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Remover
                </PixelButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg-light)]">
                <GameIcon className="text-[var(--color-game-muted)]" name="workout" size={32} />
              </div>
              <p className="text-sm font-semibold">Toque ou arraste aqui</p>
              <p className="text-game-muted text-xs">PNG, JPG ou WebP · até 5 MB</p>
            </>
          )}
        </div>
        {imageError ? <p className="text-sm text-[var(--color-game-danger)]">{imageError}</p> : null}
      </PixelCard>

      <PixelCard className="space-y-3">
        <h2 className="text-game-title text-[var(--color-game-accent)]">Informações</h2>

        <div>
          <label className="text-game-label mb-1 block" htmlFor={`${formId}-name`}>
            Nome do exercício *
          </label>
          <input
            className={fieldClass}
            id={`${formId}-name`}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Agachamento livre"
            required
            value={name}
          />
        </div>

        <div>
          <label className="text-game-label mb-1 block" htmlFor={`${formId}-description`}>
            Resumo curto
          </label>
          <input
            className={fieldClass}
            id={`${formId}-description`}
            maxLength={255}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Uma linha sobre o exercício"
            value={description}
          />
          <p className="mt-1 text-right text-[10px] text-[var(--color-game-muted)]">
            {description.length}/255
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-game-label mb-1 block" htmlFor={`${formId}-muscle`}>
              Grupo muscular
            </label>
            <select
              className={fieldClass}
              id={`${formId}-muscle`}
              onChange={(event) => setMuscleGroup(event.target.value)}
              value={muscleGroup}
            >
              {muscleGroups.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-game-label mb-1 block" htmlFor={`${formId}-difficulty`}>
              Dificuldade
            </label>
            <select
              className={fieldClass}
              id={`${formId}-difficulty`}
              onChange={(event) => setDifficulty(event.target.value)}
              value={difficulty}
            >
              {difficulties.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-game-label mb-1 block" htmlFor={`${formId}-equipment`}>
            Equipamento
          </label>
          <input
            className={fieldClass}
            id={`${formId}-equipment`}
            onChange={(event) => setEquipment(event.target.value)}
            placeholder="Barra, halteres, peso corporal..."
            value={equipment}
          />
        </div>

        {mode === 'edit' ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              checked={isActive}
              className="h-4 w-4 accent-[var(--color-game-accent)]"
              onChange={(event) => setIsActive(event.target.checked)}
              type="checkbox"
            />
            <span>Ativo no catálogo (desmarque para ocultar de novos treinos)</span>
          </label>
        ) : null}
      </PixelCard>

      <PixelCard className="space-y-3">
        <h2 className="text-game-title text-[var(--color-game-success)]">Execução</h2>

        <div>
          <label className="text-game-label mb-1 block" htmlFor={`${formId}-instructions`}>
            Como fazer
          </label>
          <textarea
            className={`${fieldClass} min-h-36 resize-y`}
            id={`${formId}-instructions`}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder={'1. Posição inicial\n2. Movimento\n3. Respiração\n4. Dicas de segurança'}
            value={instructions}
          />
        </div>

        <div>
          <label className="text-game-label mb-1 block" htmlFor={`${formId}-video`}>
            Vídeo (opcional)
          </label>
          <input
            className={fieldClass}
            id={`${formId}-video`}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://youtube.com/..."
            type="url"
            value={videoUrl}
          />
        </div>
      </PixelCard>

      {error ? <p className="text-sm text-[var(--color-game-danger)]">{error}</p> : null}

      <PixelButton disabled={isSubmitting || !name.trim()} fullWidth type="submit">
        {isSubmitting ? 'Salvando...' : submitLabel ?? (mode === 'edit' ? 'Salvar alterações' : 'Publicar no catálogo')}
      </PixelButton>
    </form>
  );
};

export default ExerciseForm;
