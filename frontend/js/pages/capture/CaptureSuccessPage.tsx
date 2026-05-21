import { useLocation, useNavigate } from 'react-router';

import GameIcon from '@/js/components/game/GameIcon';
import PokemonSprite from '@/js/components/game/PokemonSprite';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import PixelLink from '@/js/components/ui/PixelLink';
type CapturedPokemon = {
  id?: number;
  display_name?: string;
  nature?: string;
  level?: number;
  shiny?: boolean;
  species?: import('@/js/api/types.gen').PokemonSpecies;
};
import { resolvePokemonSpriteUrl } from '@/js/lib/pokemon-sprites';

const CaptureSuccessPage = () => {
  const navigate = useNavigate();
  const pokemon = (useLocation().state as { pokemon?: CapturedPokemon } | null)?.pokemon;

  if (!pokemon) {
    return (
      <>
        <MobileHeader backTo="/collection" title="Capturado!" />
        <main className="px-4 pb-28 pt-8">
          <PixelCard>
            <p className="text-sm">Pokémon capturado!</p>
            <PixelLink className="mt-4" fullWidth to="/collection" variant="primary">
              Ver coleção
            </PixelLink>
          </PixelCard>
        </main>
      </>
    );
  }

  const image = resolvePokemonSpriteUrl(pokemon.species);

  return (
    <>
      <MobileHeader backTo="/collection" title="Capturado!" />
      <main className="space-y-4 px-4 pb-28 pt-4">
        <PixelCard className="border-[var(--color-game-success)] text-center">
          <GameIcon className="mx-auto text-[var(--color-game-success)]" name="capture" size={36} />
          <p className="mt-3 text-game-title text-[var(--color-game-success)]">Captura confirmada!</p>
          <div className="my-4">
            <PokemonSprite
              alt={pokemon.display_name ?? ''}
              pokedexId={pokemon.species?.pokedex_id}
              size="lg"
              src={image}
            />
          </div>
          <p className="text-lg font-bold text-[var(--color-game-accent)]">{pokemon.display_name}</p>
          <p className="mt-1 text-sm text-[var(--color-game-muted)]">
            {pokemon.nature} · Lv. {pokemon.level}
            {pokemon.shiny ? ' · Shiny' : ''}
          </p>
        </PixelCard>

        <div className="grid gap-3">
          <PixelLink fullWidth to="/collection" variant="primary">
            Ver coleção
          </PixelLink>
          <PixelLink fullWidth to="/team" variant="secondary">
            Montar time
          </PixelLink>
          <PixelButton fullWidth onClick={() => navigate('/workout/new')} variant="secondary">
            Novo treino
          </PixelButton>
        </div>
      </main>
    </>
  );
};

export default CaptureSuccessPage;
