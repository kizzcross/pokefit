import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import { PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { mergeQueryState } from '@/js/hooks/useQueryLoading';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  removeFriend,
  sendFriendRequest,
} from '@/js/lib/social';

const FriendsPage = () => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const friendsQuery = useQuery({
    queryKey: ['friends', 'list'],
    queryFn: fetchFriends,
  });

  const requestsQuery = useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: fetchFriendRequests,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendFriendRequest(email.trim()),
    onSuccess: () => {
      setEmail('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: () => setError('Não foi possível enviar. Confira o e-mail.'),
  });

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const declineMutation = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const removeMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const { isPending, isRefetching } = mergeQueryState(friendsQuery, requestsQuery);
  const friends = friendsQuery.data ?? [];
  const incoming = requestsQuery.data?.incoming ?? [];
  const outgoing = requestsQuery.data?.outgoing ?? [];

  return (
    <>
      <MobileHeader backTo="/more" title="Amigos" subtitle="Treine junto" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar visible={isRefetching} />

        {isPending ? (
          <PageLoading label="Carregando amigos..." />
        ) : (
        <>
        <PixelCard className="space-y-3 border-[var(--color-game-info)]">
          <h2 className="text-game-title text-[var(--color-game-info)]">Adicionar amigo</h2>
          <p className="text-xs text-[var(--color-game-muted)]">Envie pedido pelo e-mail da conta.</p>
          <input
            className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-2 text-sm"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            type="email"
            value={email}
          />
          {error ? <p className="text-sm text-[var(--color-game-danger)]">{error}</p> : null}
          <PixelButton
            disabled={!email.trim() || sendMutation.isPending}
            fullWidth
            onClick={() => sendMutation.mutate()}
          >
            Enviar pedido
          </PixelButton>
        </PixelCard>

        {incoming.length > 0 ? (
          <PixelCard className="space-y-2 border-[var(--color-game-accent)]">
            <h2 className="text-game-title">Pedidos recebidos</h2>
            {incoming.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-2 border-2 border-[var(--color-game-border)] p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <TrainerAvatar
                    alt={req.from_user.display_name}
                    size="xs"
                    slug={req.from_user.trainer_sprite}
                    src={req.from_user.trainer_sprite_url}
                  />
                  <span className="text-sm font-semibold">{req.from_user.display_name}</span>
                </div>
                <div className="flex gap-1">
                  <PixelButton
                    className="min-h-9 px-2 text-[10px]"
                    disabled={acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate(req.id)}
                  >
                    Aceitar
                  </PixelButton>
                  <PixelButton
                    className="min-h-9 px-2 text-[10px]"
                    disabled={declineMutation.isPending}
                    variant="secondary"
                    onClick={() => declineMutation.mutate(req.id)}
                  >
                    Recusar
                  </PixelButton>
                </div>
              </div>
            ))}
          </PixelCard>
        ) : null}

        {outgoing.length > 0 ? (
          <PixelCard>
            <h2 className="text-game-title">Aguardando resposta</h2>
            <ul className="mt-2 space-y-1 text-sm text-[var(--color-game-muted)]">
              {outgoing.map((req) => (
                <li key={req.id}>{req.to_user.display_name}</li>
              ))}
            </ul>
          </PixelCard>
        ) : null}

        <PixelCard>
          <div className="mb-3 flex items-center gap-2">
            <GameIcon name="team" size={22} />
            <h2 className="text-game-title">Seus amigos ({friends.length})</h2>
          </div>
          {friends.length === 0 ? (
            <p className="text-sm text-[var(--color-game-muted)]">Nenhum amigo ainda.</p>
          ) : (
            <ul className="space-y-2">
              {friends.map((friend) => (
                <li
                  key={friend.id}
                  className="flex items-center justify-between gap-2 border-2 border-[var(--color-game-border)] p-3"
                >
                  <Link
                    className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-[var(--color-game-text)] no-underline"
                    to={`/friends/${friend.id}`}
                  >
                    <TrainerAvatar
                      alt={friend.display_name}
                      size="xs"
                      slug={friend.trainer_sprite}
                      src={friend.trainer_sprite_url}
                    />
                    <span className="truncate">{friend.display_name}</span>
                  </Link>
                  <PixelButton
                    className="min-h-9 px-2 text-[10px]"
                    variant="secondary"
                    onClick={() => removeMutation.mutate(friend.id)}
                  >
                    Remover
                  </PixelButton>
                </li>
              ))}
            </ul>
          )}
        </PixelCard>
        </>
        )}
      </main>
    </>
  );
};

export default FriendsPage;
