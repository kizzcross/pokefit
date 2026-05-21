import { ReactNode } from 'react';
import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelCard from '@/js/components/ui/PixelCard';
import { PageLoading } from '@/js/components/ui/GameLoading';
import { useAuth } from '@/js/hooks/useAuth';

const SuperuserGuard = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  if (!user?.is_superuser && !user?.is_staff) {
    return (
      <>
        <MobileHeader backTo="/more" title="Presentes" />
        <main className="px-4 pb-28 pt-4">
          <PixelCard>
            <p className="text-sm">Área restrita a administradores (staff ou superuser).</p>
          </PixelCard>
        </main>
      </>
    );
  }

  return children;
};

export default SuperuserGuard;
