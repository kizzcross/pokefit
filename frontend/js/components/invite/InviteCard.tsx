import { useState } from 'react';

import GameIcon from '@/js/components/game/GameIcon';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';

type Props = {
  inviteCode: string | null | undefined;
};

const InviteCard = ({ inviteCode }: Props) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  if (!inviteCode) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteLink = `${origin}/login?invite=${encodeURIComponent(inviteCode)}`;

  const copy = async (value: string, kind: 'code' | 'link') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = value;
        tmp.setAttribute('readonly', '');
        tmp.style.position = 'absolute';
        tmp.style.left = '-9999px';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const shareNative = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Pokefit',
          text: 'Treine comigo no Pokefit! Cadastre-se com meu convite:',
          url: inviteLink,
        });
      } catch {
        // user cancelled — nothing to do
      }
    } else {
      await copy(inviteLink, 'link');
    }
  };

  return (
    <PixelCard className="border-[var(--color-game-accent)]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)]">
          <GameIcon className="text-[var(--color-game-accent)]" name="missions" size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-game-title text-[var(--color-game-accent)]">Convide amigos</p>
          <p className="mt-1 text-xs text-[var(--color-game-muted)]">
            A cada cadastro pelo seu link você ganha um Pokémon de presente e já vira amigo dele.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-game-label mb-1 text-[var(--color-game-muted)]">Seu código</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 font-mono text-base tracking-widest text-[var(--color-game-text)]">
              {inviteCode}
            </code>
            <PixelButton
              onClick={() => void copy(inviteCode, 'code')}
              type="button"
              variant="secondary"
            >
              {copied === 'code' ? 'Copiado!' : 'Copiar'}
            </PixelButton>
          </div>
        </div>

        <div>
          <p className="text-game-label mb-1 text-[var(--color-game-muted)]">Link de convite</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 font-mono text-[11px] text-[var(--color-game-text)]">
              {inviteLink}
            </code>
            <PixelButton
              onClick={() => void copy(inviteLink, 'link')}
              type="button"
              variant="secondary"
            >
              {copied === 'link' ? 'Copiado!' : 'Copiar'}
            </PixelButton>
          </div>
        </div>

        <PixelButton fullWidth onClick={() => void shareNative()} type="button">
          Compartilhar convite
        </PixelButton>
      </div>
    </PixelCard>
  );
};

export default InviteCard;
