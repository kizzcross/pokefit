import { ReactNode } from 'react';
import { Navigate } from 'react-router';

import MobileHeader from '@/js/components/layout/MobileHeader';
import PixelCard from '@/js/components/ui/PixelCard';
import { PageLoading } from '@/js/components/ui/GameLoading';
import { useAuth } from '@/js/hooks/useAuth';

const StaffGuard = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  if (!user?.is_staff) {
    return (
      <>
        <MobileHeader backTo="/more" title="Admin" />
        <main className="px-4 pb-28 pt-4">
          <PixelCard>
            <p className="text-sm">Área restrita a administradores do sistema.</p>
          </PixelCard>
        </main>
      </>
    );
  }

  return children;
};

export default StaffGuard;
