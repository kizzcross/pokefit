import { Outlet } from 'react-router';

import BottomNav from '@/js/components/layout/BottomNav';
import ScreenContainer from '@/js/components/layout/ScreenContainer';

const GameShell = () => {
  return (
    <ScreenContainer className="relative min-h-dvh">
      <Outlet />
      <BottomNav />
    </ScreenContainer>
  );
};

export default GameShell;
