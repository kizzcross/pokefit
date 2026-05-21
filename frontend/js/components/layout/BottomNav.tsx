import { NavLink, useLocation } from 'react-router';

import GameIcon, { type GameIconName } from '@/js/components/game/GameIcon';
import { cn } from '@/js/lib/utils';

type NavItem = {
  to: string;
  label: string;
  icon: GameIconName;
  end?: boolean;
  matchWorkouts?: boolean;
};

const items: NavItem[] = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/calendar', label: 'Jornada', icon: 'missions' },
  { to: '/workout/new', label: 'Treino', icon: 'workout', matchWorkouts: true },
  { to: '/collection', label: 'Coleção', icon: 'collection' },
  { to: '/more', label: 'Mais', icon: 'menu' },
];

const BottomNav = () => {
  const location = useLocation();
  const onWorkoutRoute = location.pathname.startsWith('/workout');

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-1/2 z-[100] w-full max-w-md -translate-x-1/2 border-t-4 border-[var(--color-game-border)] bg-[var(--color-game-bg)] pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] shadow-[inset_0_2px_0_0_rgba(255,255,255,0.04)]"
    >
      <ul className="grid grid-cols-5 gap-0 px-1 pt-1">
        {items.map((item) => (
          <li key={item.to} className="min-w-0">
            <NavLink
              className={({ isActive: linkActive }) => {
                const isActive = item.matchWorkouts ? onWorkoutRoute : linkActive;

                return cn(
                  'group relative flex min-h-[4.25rem] flex-col items-center justify-end gap-1 px-0.5 pb-2 pt-2 no-underline transition-colors',
                  isActive && 'text-[var(--color-game-accent)]',
                  !isActive && 'text-[var(--color-game-muted)] hover:text-[var(--color-game-text)]',
                );
              }}
              end={item.end}
              to={item.to}
            >
              {({ isActive: linkActive }) => {
                const isActive = item.matchWorkouts ? onWorkoutRoute : linkActive;
                const isCenter = item.matchWorkouts;

                return (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        'absolute top-0 left-1/2 h-1 w-7 -translate-x-1/2 border-2 border-[var(--color-game-border)] transition-opacity',
                        isActive
                          ? 'bg-[var(--color-game-accent)] opacity-100'
                          : 'opacity-0',
                      )}
                    />

                    <span
                      className={cn(
                        'relative flex items-center justify-center border-[3px] border-[var(--color-game-border)] transition-transform',
                        isCenter ? 'h-11 w-11 -mt-1' : 'h-9 w-9',
                        isActive
                          ? 'bg-[var(--color-game-accent)] text-[var(--color-game-border)] shadow-[3px_3px_0_0_var(--color-game-border)]'
                          : 'bg-[var(--color-game-panel)] group-hover:bg-[var(--color-game-bg-light)]',
                        isCenter &&
                          !isActive &&
                          'border-[var(--color-game-accent-dark)] bg-[var(--color-game-bg-light)]',
                      )}
                    >
                      <GameIcon name={item.icon} size={isCenter ? 24 : 20} />
                    </span>

                    <span
                      className={cn(
                        'max-w-full truncate text-[9px] font-bold uppercase leading-none tracking-wide',
                        isActive ? 'text-[var(--color-game-accent)]' : 'text-[var(--color-game-muted)]',
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                );
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;
