import { motion } from 'framer-motion';
import { useState } from 'react';
import { useLocation } from 'react-router';

import PixelButton from '@/js/components/ui/PixelButton';
import PixelCard from '@/js/components/ui/PixelCard';
import { useAuth } from '@/js/hooks/useAuth';
import { getApiErrorMessage } from '@/js/lib/api-errors';

const LoginPage = () => {
  const { login, register } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, nickname: nickname.trim() });
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
            {error ? <p className="text-sm text-[var(--color-game-danger)]">{error}</p> : null}
            <PixelButton className="w-full" disabled={loading} type="submit">
              {loading ? 'Entrando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </PixelButton>
          </form>

          <button
            className="mt-4 w-full text-center text-xs text-[var(--color-game-info)]"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
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
