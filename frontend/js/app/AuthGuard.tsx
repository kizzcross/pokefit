import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { PageLoading } from '@/js/components/ui/GameLoading';
import { useAuth } from '@/js/hooks/useAuth';

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-game-bg)]">
        <PageLoading label="Entrando..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return children;
};

export default AuthGuard;
