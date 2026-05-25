import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { ExercisesImportCreateResponses } from '@/js/api/types.gen';

import { exercisesImportCreate } from '@/js/api/sdk.gen';
import StaffGuard from '@/js/app/StaffGuard';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { getApiErrorMessage } from '@/js/lib/api-errors';

type ImportResult = ExercisesImportCreateResponses[200];

const fieldClass =
  'w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 text-sm font-mono outline-none transition focus:border-[var(--color-game-accent)]';

const SAMPLE_PAYLOAD = JSON.stringify(
  [
    {
      name: 'Supino reto com halteres',
      slug: 'supino-reto-com-halteres',
      description: 'Exercício de peito feito em banco reto.',
      instructions: 'Deite no banco, desça os halteres até a linha do peito e empurre para cima.',
      muscle_group: 'chest',
      difficulty: 'intermediate',
      equipment: 'Halteres, banco reto',
      is_active: true,
    },
  ],
  null,
  2,
);

const statusColor: Record<string, string> = {
  created: 'text-[var(--color-game-success)]',
  updated: 'text-[var(--color-game-info)]',
  skipped: 'text-[var(--color-game-muted)]',
  failed: 'text-[var(--color-game-danger)]',
};

const ExerciseImportPage = () => {
  const [rawJson, setRawJson] = useState<string>(SAMPLE_PAYLOAD);
  const [createOnly, setCreateOnly] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const itemCount = useMemo(() => {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) return parsed.length;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.exercises)) {
        return parsed.exercises.length;
      }
      return 0;
    } catch {
      return 0;
    }
  }, [rawJson]);

  const importMutation = useMutation({
    mutationFn: async (body: unknown) => {
      const response = await exercisesImportCreate({
        body: body as never,
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data ?? null);
    },
    onError: (error: unknown) => {
      setParseError(getApiErrorMessage(error, 'Erro ao importar exercícios.'));
    },
  });

  const handleSubmit = () => {
    setParseError(null);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (exc) {
      setParseError(`JSON inválido: ${(exc as Error).message}`);
      return;
    }

    let exercises: unknown[];
    if (Array.isArray(parsed)) {
      exercises = parsed;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { exercises?: unknown[] }).exercises)
    ) {
      exercises = (parsed as { exercises: unknown[] }).exercises;
    } else {
      setParseError('Envie uma lista [{...}] ou um objeto com a chave "exercises".');
      return;
    }

    if (exercises.length === 0) {
      setParseError('Lista vazia. Adicione pelo menos um exercício.');
      return;
    }

    importMutation.mutate({
      exercises,
      create_only: createOnly,
      dry_run: dryRun,
    });
  };

  const summary = result?.summary;

  return (
    <StaffGuard>
      <MobileHeader backTo="/exercises" subtitle="Catálogo global" title="Importar em massa" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <PixelCard>
          <p className="text-game-body text-sm text-[var(--color-game-muted)]">
            Cole um JSON com a lista de exercícios. Cada item exige <strong>name</strong>,{' '}
            <strong>muscle_group</strong> e <strong>difficulty</strong>. Campos como{' '}
            <em>slug, description, instructions, equipment, video_url, is_active</em> são opcionais.
          </p>
          <p className="mt-2 text-xs text-[var(--color-game-muted)]">
            <strong>muscle_group:</strong> chest, back, legs, shoulders, arms, core, cardio,
            full_body, mobility. <strong>difficulty:</strong> beginner, intermediate, advanced.
          </p>
          <p className="mt-2 text-xs text-[var(--color-game-muted)]">
            Match por slug (ou name se slug ausente). Sem slug, será gerado automaticamente.
          </p>
        </PixelCard>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-game-label text-[var(--color-game-text)]" htmlFor="bulk-json">
              Lista (JSON)
            </label>
            <span className="text-xs text-[var(--color-game-muted)]">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <textarea
            className={`${fieldClass} min-h-80 resize-y`}
            id="bulk-json"
            onChange={(event) => setRawJson(event.target.value)}
            placeholder='[{"name": "...", "muscle_group": "chest", "difficulty": "beginner"}]'
            spellCheck={false}
            value={rawJson}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="pixel-panel flex cursor-pointer items-center gap-2 rounded-sm p-3">
            <input
              checked={dryRun}
              className="h-4 w-4 accent-[var(--color-game-accent)]"
              onChange={(event) => setDryRun(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm">Dry-run (simular)</span>
          </label>
          <label className="pixel-panel flex cursor-pointer items-center gap-2 rounded-sm p-3">
            <input
              checked={createOnly}
              className="h-4 w-4 accent-[var(--color-game-accent)]"
              onChange={(event) => setCreateOnly(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm">Só criar novos</span>
          </label>
        </div>

        {parseError ? (
          <PixelCard className="border-[var(--color-game-danger)]">
            <p className="text-sm text-[var(--color-game-danger)]">{parseError}</p>
          </PixelCard>
        ) : null}

        <PixelButton
          disabled={importMutation.isPending || itemCount === 0}
          fullWidth
          onClick={handleSubmit}
        >
          {importMutation.isPending
            ? 'Importando...'
            : dryRun
              ? `Simular ${itemCount} exercício(s)`
              : `Importar ${itemCount} exercício(s)`}
        </PixelButton>

        {summary ? (
          <PixelCard className="border-[var(--color-game-success)]">
            <p className="text-game-title text-[var(--color-game-success)]">
              {result?.dry_run ? 'Simulação concluída' : 'Importação concluída'}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[var(--color-game-muted)]">Criados:</span>{' '}
                <span className="text-[var(--color-game-success)]">{summary.created ?? 0}</span>
              </div>
              <div>
                <span className="text-[var(--color-game-muted)]">Atualizados:</span>{' '}
                <span className="text-[var(--color-game-info)]">{summary.updated ?? 0}</span>
              </div>
              <div>
                <span className="text-[var(--color-game-muted)]">Ignorados:</span>{' '}
                <span>{summary.skipped ?? 0}</span>
              </div>
              <div>
                <span className="text-[var(--color-game-muted)]">Erros:</span>{' '}
                <span className="text-[var(--color-game-danger)]">{summary.failed ?? 0}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--color-game-muted)]">
              Total processado: {summary.total ?? 0}
            </p>
          </PixelCard>
        ) : null}

        {result?.results?.length ? (
          <PixelCard>
            <p className="text-game-label mb-2 text-[var(--color-game-muted)]">Detalhes</p>
            <ul className="space-y-1 text-xs">
              {result.results.map((r, idx) => (
                <li
                  key={`${r.name ?? 'item'}-${idx}`}
                  className="flex items-start justify-between gap-2 border-b border-[var(--color-game-border)]/20 pb-1 last:border-0"
                >
                  <span className="min-w-0 flex-1 truncate">{r.name || '(sem nome)'}</span>
                  <span
                    className={`shrink-0 font-semibold uppercase ${
                      statusColor[r.status ?? ''] ?? ''
                    }`}
                  >
                    {r.status}
                  </span>
                  {r.reason ? (
                    <span className="ml-2 max-w-[50%] truncate text-[var(--color-game-muted)]">
                      {r.reason}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </PixelCard>
        ) : null}
      </main>
    </StaffGuard>
  );
};

export default ExerciseImportPage;
