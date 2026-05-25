import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import CalendarGrid from '@/js/components/calendar/CalendarGrid';
import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import StatBar from '@/js/components/game/StatBar';
import TrainerAvatar from '@/js/components/game/TrainerAvatar';
import MobileHeader from '@/js/components/layout/MobileHeader';
import UserLink from '@/js/components/social/UserLink';
import TimelineEventCard from '@/js/components/timeline/TimelineEventCard';
import { LoadingCardSkeleton, PageLoading, QueryRefetchBar } from '@/js/components/ui/GameLoading';
import PixelCard from '@/js/components/ui/PixelCard';
import { isQueryRefetching } from '@/js/hooks/useQueryLoading';
import { getApiErrorMessage } from '@/js/lib/api-errors';
import { buildMonthGrid, fetchUserCalendar, localDateIso } from '@/js/lib/calendar';
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';
import {
  fetchUserFriends,
  fetchUserPokemon,
  fetchUserProfile,
  fetchUserTeam,
} from '@/js/lib/profile';
import { fetchUserTimeline } from '@/js/lib/timeline';

const COLLECTION_PREVIEW = 6;
const FRIENDS_PREVIEW = 8;

const UserProfilePage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const isValidId = Number.isFinite(userId);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState<'timeline' | 'calendar'>('timeline');
  const [friendsOpen, setFriendsOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: isValidId,
    retry: false,
  });

  const profile = profileQuery.data;
  const accessDenied =
    profileQuery.isError && !profileQuery.isPending && !profileQuery.isFetching;

  const teamQuery = useQuery({
    queryKey: ['user-team', userId],
    queryFn: () => fetchUserTeam(userId),
    enabled: isValidId && Boolean(profile),
  });

  const pokemonQuery = useQuery({
    queryKey: ['user-pokemon', userId],
    queryFn: () => fetchUserPokemon(userId),
    enabled: isValidId && Boolean(profile),
  });

  const friendsQuery = useQuery({
    queryKey: ['user-friends', userId],
    queryFn: () => fetchUserFriends(userId),
    enabled: isValidId && Boolean(profile) && friendsOpen,
  });

  const timelineQuery = useQuery({
    queryKey: ['user-timeline', userId],
    queryFn: () => fetchUserTimeline(userId),
    enabled: isValidId && Boolean(profile) && tab === 'timeline',
  });

  const calendarQuery = useQuery({
    queryKey: ['user-calendar', userId, year, month],
    queryFn: () => fetchUserCalendar(userId, year, month),
    enabled: isValidId && Boolean(profile) && tab === 'calendar',
  });

  const profileUser = profile?.user;
  const displayName = profileUser?.display_name ?? 'Treinador';
  const team = teamQuery.data?.results ?? [];
  const pokemons = pokemonQuery.data?.results ?? [];
  const friends = friendsQuery.data ?? [];
  const cells = useMemo(
    () => buildMonthGrid(year, month, calendarQuery.data?.days),
    [calendarQuery.data?.days, year, month],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  if (!isValidId) {
    return (
      <>
        <MobileHeader backTo="/friends" title="Perfil" />
        <main className="px-4 pb-28 pt-4">
          <PixelCard>
            <p className="text-sm text-[var(--color-game-danger)]">Usuário inválido.</p>
          </PixelCard>
        </main>
      </>
    );
  }

  if (accessDenied) {
    return (
      <>
        <MobileHeader backTo="/friends" title="Perfil" />
        <main className="px-4 pb-28 pt-4">
          <PixelCard className="border-[var(--color-game-danger)]">
            <p className="text-game-title text-[var(--color-game-danger)]">
              Perfil indisponível
            </p>
            <p className="mt-2 text-sm text-[var(--color-game-muted)]">
              {getApiErrorMessage(
                profileQuery.error,
                'Você não tem permissão para ver este perfil. Vocês precisam ser amigos.',
              )}
            </p>
          </PixelCard>
        </main>
      </>
    );
  }

  return (
    <>
      <MobileHeader
        action={
          profileUser ? (
            <TrainerAvatar
              alt={displayName}
              size="xs"
              slug={profileUser.trainer_sprite}
              src={profileUser.trainer_sprite_url}
            />
          ) : null
        }
        backTo={profile?.is_self ? '/more' : '/friends'}
        subtitle={profile?.is_self ? 'Seu perfil público' : 'Perfil'}
        title={displayName}
      />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <QueryRefetchBar visible={isQueryRefetching(profileQuery)} />

        {profileQuery.isPending && !profile ? (
          <LoadingCardSkeleton lines={3} />
        ) : profile ? (
          <PixelCard className="border-[var(--color-game-accent)]">
            <div className="flex items-center gap-3">
              <TrainerAvatar
                alt={displayName}
                size="lg"
                slug={profileUser?.trainer_sprite}
                src={profileUser?.trainer_sprite_url}
              />
              <div className="min-w-0 flex-1">
                <p className="text-game-title text-[var(--color-game-accent)]">
                  @{profileUser?.nickname || displayName}
                </p>
                <p className="text-xs text-[var(--color-game-muted)]">{displayName}</p>
                {profile.is_self ? (
                  <p className="mt-1 text-[10px] text-[var(--color-game-muted)]">Você</p>
                ) : profile.is_friend ? (
                  <p className="mt-1 text-[10px] text-[var(--color-game-success)]">Amigo</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <Link
                className="border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-1 py-2 no-underline transition hover:border-[var(--color-game-accent)]"
                to={profile.is_self ? '/friends' : `/users/${userId}/friends`}
              >
                <p className="text-game-label text-[var(--color-game-muted)]">Amigos</p>
                <p className="text-base font-bold text-[var(--color-game-text)]">
                  {profile.friend_count}
                </p>
              </Link>
              <Link
                className="border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-1 py-2 no-underline transition hover:border-[var(--color-game-accent)]"
                to={profile.is_self ? '/collection' : `/users/${userId}/pokemon`}
              >
                <p className="text-game-label text-[var(--color-game-muted)]">Pokémon</p>
                <p className="text-base font-bold text-[var(--color-game-text)]">
                  {profile.pokemon_count}
                </p>
              </Link>
              <Link
                className="border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-1 py-2 no-underline transition hover:border-[var(--color-game-accent)]"
                to={profile.is_self ? '/team' : `/users/${userId}/team`}
              >
                <p className="text-game-label text-[var(--color-game-muted)]">Time</p>
                <p className="text-base font-bold text-[var(--color-game-text)]">
                  {profile.team_count}/6
                </p>
              </Link>
              <div className="border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-1 py-2">
                <p className="text-game-label text-[var(--color-game-muted)]">Streak</p>
                <p className="text-base font-bold text-[var(--color-game-text)]">
                  {profile.current_streak}
                </p>
              </div>
            </div>
          </PixelCard>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-game-label text-[var(--color-game-muted)]">Time ativo</p>
            <span className="text-[10px] text-[var(--color-game-muted)]">
              {team.length}/6
            </span>
          </div>
          {teamQuery.isPending ? (
            <LoadingCardSkeleton lines={2} />
          ) : team.length === 0 ? (
            <PixelCard>
              <p className="text-xs text-[var(--color-game-muted)]">
                {profile?.is_self
                  ? 'Você ainda não montou um time. Escolha 6 favoritos!'
                  : 'Esse treinador ainda não montou um time.'}
              </p>
            </PixelCard>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {team.map((pokemon) => {
                const image = resolvePokemonSpriteUrl(pokemon.species);
                return (
                  <Link
                    key={pokemon.id}
                    className="no-underline"
                    to={profile?.is_self ? `/pokemon/${pokemon.id}` : '#'}
                    onClick={(e) => {
                      if (!profile?.is_self) e.preventDefault();
                    }}
                  >
                    <PixelCard className="px-2 py-2 text-center">
                      <PokemonSprite
                        alt={pokemon.display_name ?? 'pokemon'}
                        pokedexId={pokemon.species?.pokedex_id}
                        size="sm"
                        src={image}
                      />
                      <p className="mt-1 truncate text-[11px] font-semibold">
                        {pokemon.display_name}
                      </p>
                      <p className="text-[10px] text-[var(--color-game-muted)]">
                        Lv. {pokemon.level}
                      </p>
                    </PixelCard>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-game-label text-[var(--color-game-muted)]">Coleção</p>
            <span className="text-[10px] text-[var(--color-game-muted)]">
              {pokemonQuery.data?.count ?? 0}
            </span>
          </div>
          {pokemonQuery.isPending ? (
            <LoadingCardSkeleton lines={2} />
          ) : pokemons.length === 0 ? (
            <PixelCard>
              <p className="text-xs text-[var(--color-game-muted)]">
                Nenhum Pokémon capturado ainda.
              </p>
            </PixelCard>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {pokemons.slice(0, COLLECTION_PREVIEW).map((pokemon) => {
                  const image = resolvePokemonSpriteUrl(pokemon.species);
                  const interactive = profile?.is_self;
                  const cardContent = (
                    <PixelCard className="px-2 py-2 text-center">
                      <PokemonSprite
                        alt={pokemon.display_name ?? 'pokemon'}
                        pokedexId={pokemon.species?.pokedex_id}
                        size="sm"
                        src={image}
                      />
                      <p className="mt-1 truncate text-[11px] font-semibold">
                        {pokemon.display_name}
                      </p>
                      <p className="text-[10px] text-[var(--color-game-muted)]">
                        Lv. {pokemon.level}
                      </p>
                      <div className="mt-1 px-1">
                        <StatBar
                          color="bg-[var(--color-game-accent)]"
                          label="XP"
                          max={100}
                          value={pokemon.experience_progress_percent ?? 0}
                        />
                      </div>
                    </PixelCard>
                  );
                  return interactive ? (
                    <Link key={pokemon.id} className="no-underline" to={`/pokemon/${pokemon.id}`}>
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={pokemon.id}>{cardContent}</div>
                  );
                })}
              </div>
              {pokemons.length > COLLECTION_PREVIEW ? (
                <p className="text-center text-[11px] text-[var(--color-game-muted)]">
                  +{pokemons.length - COLLECTION_PREVIEW} Pokémon na coleção
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-game-label text-[var(--color-game-muted)]">Amigos</p>
          <PixelCard className="p-0">
            <button
              aria-controls="user-profile-friends-list"
              aria-expanded={friendsOpen}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              onClick={() => setFriendsOpen((open) => !open)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <GameIcon
                  className="text-[var(--color-game-info)]"
                  name="team"
                  size={20}
                />
                <span className="font-semibold text-[var(--color-game-text)]">
                  Ver amigos
                </span>
              </span>
              <span className="flex items-center gap-2 text-[var(--color-game-muted)]">
                <span className="text-xs">{profile?.friend_count ?? 0}</span>
                <span aria-hidden className="text-sm">
                  {friendsOpen ? '▾' : '▸'}
                </span>
              </span>
            </button>
            {friendsOpen ? (
              <div
                className="border-t-2 border-[var(--color-game-border)] px-4 py-3"
                id="user-profile-friends-list"
              >
                {friendsQuery.isPending ? (
                  <LoadingCardSkeleton lines={2} />
                ) : friends.length === 0 ? (
                  <p className="text-xs text-[var(--color-game-muted)]">
                    Sem amigos ainda. Que tal mandar um convite?
                  </p>
                ) : (
                  <>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {friends.slice(0, FRIENDS_PREVIEW).map((friend) => (
                        <li key={friend.id}>
                          <UserLink
                            avatarSize="xs"
                            className="w-full rounded-sm border-2 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-2 py-2 text-sm"
                            showAvatar
                            user={friend}
                          />
                        </li>
                      ))}
                    </ul>
                    {friends.length > FRIENDS_PREVIEW ? (
                      <p className="mt-2 text-center text-[10px] text-[var(--color-game-muted)]">
                        +{friends.length - FRIENDS_PREVIEW} amigos
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </PixelCard>
        </section>

        <section className="space-y-2 pt-2">
          <p className="text-game-label text-[var(--color-game-muted)]">Atividade</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`pixel-btn min-h-10 ${tab === 'timeline' ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
              onClick={() => setTab('timeline')}
              type="button"
            >
              Timeline
            </button>
            <button
              className={`pixel-btn min-h-10 ${tab === 'calendar' ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
              onClick={() => setTab('calendar')}
              type="button"
            >
              Jornada
            </button>
          </div>

          {tab === 'timeline' ? (
            timelineQuery.isPending ? (
              <PageLoading label="Carregando timeline..." />
            ) : (timelineQuery.data?.results ?? []).length === 0 ? (
              <PixelCard>
                <p className="text-xs text-[var(--color-game-muted)]">
                  Nenhuma atividade recente.
                </p>
              </PixelCard>
            ) : (
              <div className="space-y-3">
                {(timelineQuery.data?.results ?? []).map((event, index) => (
                  <TimelineEventCard
                    key={`${event.type}-${event.at}-${index}`}
                    event={event}
                    showActor={false}
                  />
                ))}
              </div>
            )
          ) : calendarQuery.isPending ? (
            <div className="space-y-3">
              <LoadingCardSkeleton lines={2} />
              <LoadingCardSkeleton lines={4} />
            </div>
          ) : (
            <>
              <PixelCard>
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="pixel-btn pixel-btn-secondary min-h-10 min-w-10 px-2"
                    onClick={() => shiftMonth(-1)}
                    type="button"
                  >
                    ◀
                  </button>
                  <p className="text-game-title text-[var(--color-game-accent)]">
                    {String(month).padStart(2, '0')}/{year}
                  </p>
                  <button
                    className="pixel-btn pixel-btn-secondary min-h-10 min-w-10 px-2"
                    onClick={() => shiftMonth(1)}
                    type="button"
                  >
                    ▶
                  </button>
                </div>
              </PixelCard>
              <PixelCard
                className={calendarQuery.isFetching ? 'opacity-60 transition-opacity' : undefined}
              >
                <CalendarGrid
                  cells={cells}
                  onSelectDay={() => {}}
                  selectedDate={null}
                  todayIso={localDateIso(now)}
                />
              </PixelCard>
            </>
          )}
        </section>
      </main>
    </>
  );
};

export default UserProfilePage;
