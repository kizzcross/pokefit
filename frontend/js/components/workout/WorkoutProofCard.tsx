import { useRef, useState } from 'react';

import GameIcon from '@/js/components/game/GameIcon';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { cn } from '@/js/lib/utils';

type WorkoutProofCardProps = {
  proofPhotoUrl?: string | null;
  proofCaption?: string;
  isUploading?: boolean;
  error?: string | null;
  onUpload: (file: File, caption: string) => void;
};

const WorkoutProofCard = ({
  proofPhotoUrl,
  proofCaption = '',
  isUploading = false,
  error,
  onUpload,
}: WorkoutProofCardProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState(proofCaption);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(proofPhotoUrl ?? null);

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return;
    setPendingFile(file);
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const submit = () => {
    if (!pendingFile) return;
    onUpload(pendingFile, caption.trim());
    setPendingFile(null);
  };

  const hasProof = Boolean(proofPhotoUrl && !pendingFile);

  return (
    <PixelCard className="space-y-3 border-[var(--color-game-info)]">
      <div className="flex items-center gap-2">
        <GameIcon className="text-[var(--color-game-info)]" name="capture" size={22} />
        <h2 className="text-game-title text-[var(--color-game-info)]">Prova do treino</h2>
      </div>
      <p className="text-xs text-[var(--color-game-muted)]">
        Tire uma foto para provar que concluiu. Amigos podem ver na timeline e no calendário.
      </p>

      <div
        className={cn(
          'relative flex min-h-40 flex-col items-center justify-center gap-2 border-4 border-dashed px-4 py-4 text-center',
          preview
            ? 'border-[var(--color-game-accent)] bg-[var(--color-game-panel)]'
            : 'border-[var(--color-game-border)] bg-[var(--color-game-bg)]',
        )}
      >
        <input
          accept="image/png,image/jpeg,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
        {preview ? (
          <img
            alt="Prova do treino"
            className="max-h-48 w-full object-contain"
            src={preview}
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <>
            <GameIcon className="text-[var(--color-game-muted)]" name="capture" size={40} />
            <p className="text-sm font-semibold">Toque para tirar foto</p>
          </>
        )}
        <PixelButton
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? 'Trocar foto' : 'Abrir câmera'}
        </PixelButton>
      </div>

      <input
        className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-game-accent)]"
        maxLength={140}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Legenda opcional (ex: fechou o treino!)"
        value={caption}
      />

      {pendingFile ? (
        <PixelButton disabled={isUploading} fullWidth onClick={submit}>
          {isUploading ? 'Enviando...' : 'Salvar foto de prova'}
        </PixelButton>
      ) : null}

      {hasProof ? (
        <p className="text-center text-xs text-[var(--color-game-success)]">Foto enviada — pode finalizar!</p>
      ) : (
        <p className="text-center text-xs text-[var(--color-game-muted)]">Obrigatório para finalizar</p>
      )}

      {error ? <p className="text-sm text-[var(--color-game-danger)]">{error}</p> : null}
    </PixelCard>
  );
};

export default WorkoutProofCard;
