import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import { usersInviteInfoRetrieve } from '@/js/api';
import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { useAuth } from '@/js/hooks/useAuth';
import { getApiErrorMessage } from '@/js/lib/api-errors';

const LoginPage = () => {
  const { login, register } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const inviteFromUrl = useMemo(
    () => (searchParams.get('invite') || '').trim().toUpperCase(),
    [searchParams],
  );

  const [mode, setMode] = useState<'login' | 'register'>(inviteFromUrl ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inviteFromUrl) {
      setInviteCode(inviteFromUrl);
      setMode('register');
    }
  }, [inviteFromUrl]);

  const inviteInfoQuery = useQuery({
    queryKey: ['auth', 'invite-info', inviteCode],
    queryFn: async () => {
      if (!inviteCode) return null;
      try {
        const response = await usersInviteInfoRetrieve({
          query: { code: inviteCode },
          throwOnError: true,
        });
        return response.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(inviteCode) && mode === 'register',
    staleTime: 5 * 60 * 1000,
  });

  const inviter = inviteInfoQuery.data;
  const inviteCodeIsBad =
    Boolean(inviteCode) && mode === 'register' && inviteInfoQuery.isFetched && !inviter;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({
          email,
          password,
          nickname: nickname.trim(),
          invite_code: inviteCode || undefined,
        });
      }
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          mode === 'login'
            ? 'Não foi possível entrar. Verifique email e senha.'
            : 'Não foi possível criar a conta. Verifique os dados.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setError(null);
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const clearInvite = () => {
    setInviteCode('');
    const next = new URLSearchParams(searchParams);
    next.delete('invite');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-game-bg)] px-4">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
      >
        <div className="mb-6 text-center">
          <p className="text-game-hero text-[var(--color-game-accent)]">POKEFIT</p>
          <p className="mt-2 text-game-muted">Academia gamificada</p>
        </div>

        {mode === 'register' && inviter ? (
          <PixelCard className="mb-3 border-[var(--color-game-accent)]">
            <div className="flex items-center gap-3">
              {inviter.trainer_sprite_url ? (
                <img
                  alt={inviter.display_name || ''}
                  className="h-12 w-12 shrink-0"
                  src={inviter.trainer_sprite_url}
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-game-label text-[var(--color-game-muted)]">Convite de</p>
                <p className="text-game-title truncate text-[var(--color-game-accent)]">
                  @{inviter.nickname || inviter.display_name}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-game-muted)]">
                  Ao se cadastrar você vira amigo e ele ganha um Pokémon de presente.
                </p>
              </div>
            </div>
          </PixelCard>
        ) : null}

        {mode === 'register' && inviteCodeIsBad ? (
          <PixelCard className="mb-3 border-[var(--color-game-danger)]">
            <p className="text-sm text-[var(--color-game-danger)]">
              Código de convite inválido ou expirado.
            </p>
            <button
              className="mt-2 text-[10px] text-[var(--color-game-muted)] underline"
              onClick={clearInvite}
              type="button"
            >
              Cadastrar sem convite
            </button>
          </PixelCard>
        ) : null}

        <PixelCard>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-game-label mb-1 block">Email</label>
              <input
                className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--color-game-accent)]"
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            {mode === 'register' ? (
              <div>
                <label className="text-game-label mb-1 block">Nickname</label>
                <input
                  autoComplete="username"
                  className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--color-game-accent)]"
                  maxLength={24}
                  onChange={(e) => setNickname(e.target.value.toLowerCase())}
                  placeholder="ex: kizz_cross"
                  required
                  type="text"
                  value={nickname}
                />
                <p className="mt-1 text-[10px] text-[var(--color-game-muted)]">
                  3–24 caracteres: letras minúsculas, números e _
                </p>
              </div>
            ) : null}
            <div>
              <label className="text-game-label mb-1 block">Senha</label>
              <input
                className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 text-sm outline-none focus:border-[var(--color-game-accent)]"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {mode === 'register' ? (
              <div>
                <label className="text-game-label mb-1 block">Código de convite (opcional)</label>
                <input
                  className="w-full rounded-sm border-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] px-3 py-3 font-mono text-sm tracking-wider uppercase outline-none focus:border-[var(--color-game-accent)]"
                  maxLength={12}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="EX: AB23CD45"
                  type="text"
                  value={inviteCode}
                />
                <p className="mt-1 text-[10px] text-[var(--color-game-muted)]">
                  Se um amigo te convidou, vocês ficam amigos automaticamente.
                </p>
              </div>
            ) : null}
            {error ? <p className="text-sm text-[var(--color-game-danger)]">{error}</p> : null}
            <PixelButton className="w-full" disabled={loading} type="submit">
              {loading ? 'Entrando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </PixelButton>
          </form>

          <button
            className="mt-4 w-full text-center text-xs text-[var(--color-game-info)]"
            onClick={toggleMode}
            type="button"
          >
            {mode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
          </button>
        </PixelCard>

        {location.state && 'from' in (location.state as object) ? (
          <p className="mt-3 text-center text-xs text-[var(--color-game-muted)]">
            Faça login para continuar sua jornada.
          </p>
        ) : null}
      </motion.div>
    </div>
  );
};

export default LoginPage;
