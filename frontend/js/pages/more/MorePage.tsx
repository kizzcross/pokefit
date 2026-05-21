import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router';

import GameIcon, { type GameIconName } from '@/js/components/game/GameIcon';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import PixelLink from '@/js/components/ui/PixelLink';
import { LoadingCardSkeleton } from '@/js/components/ui/GameLoading';
import { useAuth } from '@/js/hooks/useAuth';
import { fetchPendingEncounter } from '@/js/lib/encounter';
import PixelBadge from '@/js/components/ui/PixelBadge';
import { useAppNotifications } from '@/js/hooks/useAppNotifications';
import { useGameStore } from '@/js/stores/game-store';

const links: { to: string; label: string; icon: GameIconName }[] = [
  { to: '/gifts', label: 'Caixa de entrada', icon: 'missions' },
  { to: '/profile', label: 'Perfil', icon: 'team' },
  { to: '/workouts', label: 'Meus treinos', icon: 'workout' },
  { to: '/timeline', label: 'Timeline', icon: 'dex' },
  { to: '/friends', label: 'Amigos', icon: 'team' },
  { to: '/team', label: 'Meu time', icon: 'team' },
  { to: '/missions', label: 'Missões diárias', icon: 'missions' },
  { to: '/ranking', label: 'Ranking global', icon: 'ranking' },
];

const MorePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const setEncounter = useGameStore((s) => s.setEncounter);
  const location = useLocation();
  const locationState = location.state as {
    exerciseCreated?: boolean;
    exerciseUpdated?: boolean;
  } | null;
  const exerciseCreated = Boolean(locationState?.exerciseCreated);
  const exerciseUpdated = Boolean(locationState?.exerciseUpdated);

  const pendingQuery = useQuery({
    queryKey: ['workouts', 'pending-encounter'],
    queryFn: fetchPendingEncounter,
  });
  const pending = pendingQuery.data;

  const { giftCount: giftPendingCount, friendRequestCount } = useAppNotifications();

  return (
    <>
      <MobileHeader title="Mais" />
      <main className="space-y-3 px-4 pb-28 pt-4">
        {exerciseCreated || exerciseUpdated ? (
          <PixelCard className="border-[var(--color-game-success)]">
            <p className="text-sm text-[var(--color-game-success)]">
              {exerciseUpdated ? 'Exercício atualizado!' : 'Exercício publicado com sucesso!'}
            </p>
          </PixelCard>
        ) : null}

        {pendingQuery.isPending ? (
          <LoadingCardSkeleton lines={2} />
        ) : pending ? (
          <PixelCard className="border-[var(--color-game-danger)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-game-title text-[var(--color-game-danger)]">Captura pendente</p>
                <p className="mt-1 text-sm">{pending.species.name}</p>
              </div>
              <GameIcon className="text-[var(--color-game-danger)]" name="explore" size={28} />
            </div>
            <PixelButton
              className="mt-3"
              fullWidth
              onClick={() => {
                setEncounter(pending.species, pending.workout_id);
                navigate('/capture');
              }}
            >
              Capturar agora
            </PixelButton>
          </PixelCard>
        ) : null}

        {user?.is_superuser || user?.is_staff ? (
          <section className="space-y-2">
            <p className="text-game-label text-[var(--color-game-muted)]">Superuser</p>
            <PixelCard className="border-[var(--color-game-danger)]">
              <p className="text-game-title text-[var(--color-game-danger)]">Enviar presentes</p>
              <p className="mt-1 text-xs text-[var(--color-game-muted)]">
                Mensagem + 1 Pokémon ou escolha entre 2–3 para vários jogadores
              </p>
              <PixelLink className="mt-3" fullWidth to="/admin/gifts/send" variant="secondary">
                Abrir painel
              </PixelLink>
            </PixelCard>
          </section>
        ) : null}

        {user?.is_staff ? (
          <section className="space-y-2">
            <p className="text-game-label text-[var(--color-game-muted)]">Catálogo (staff)</p>
            <PixelCard className="border-[var(--color-game-accent)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)]">
                  <GameIcon className="text-[var(--color-game-accent)]" name="admin" size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-game-title text-[var(--color-game-accent)]">Exercícios</p>
                  <p className="mt-1 text-xs text-[var(--color-game-muted)]">
                    Listar, editar, excluir e cadastrar no catálogo global
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PixelLink fullWidth to="/exercises" variant="secondary">
                  Ver lista
                </PixelLink>
                <PixelLink fullWidth to="/exercises/new" variant="secondary">
                  Novo
                </PixelLink>
              </div>
            </PixelCard>
          </section>
        ) : null}

        <section className="space-y-2">
          <p className="text-game-label text-[var(--color-game-muted)]">Menu</p>
          {links.map((item) => {
            const badgeCount =
              item.to === '/gifts'
                ? giftPendingCount
                : item.to === '/friends'
                  ? friendRequestCount
                  : 0;

            return (
            <Link
              key={item.to}
              className="pixel-panel relative flex items-center justify-between gap-3 rounded-sm p-4 no-underline transition hover:border-[var(--color-game-accent)]"
              to={item.to}
            >
              <span className="font-semibold text-[var(--color-game-text)]">{item.label}</span>
              <div className="relative">
                <GameIcon className="text-[var(--color-game-info)]" name={item.icon} size={28} />
                <PixelBadge count={badgeCount} />
              </div>
            </Link>
            );
          })}
        </section>

        <footer className="border-t border-[var(--color-game-border)]/30 pt-6 text-center">
          {user?.email ? (
            <p className="truncate px-4 text-[10px] text-[var(--color-game-muted)]/60">{user.email}</p>
          ) : null}
          <button
            className="mt-2 text-[10px] text-[var(--color-game-muted)]/40 underline-offset-2 transition hover:text-[var(--color-game-muted)] hover:underline"
            onClick={() => {
              if (window.confirm('Encerrar sessão neste dispositivo?')) {
                void logout();
              }
            }}
            type="button"
          >
            Encerrar sessão
          </button>
        </footer>
      </main>
    </>
  );
};

export default MorePage;
