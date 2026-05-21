import { SVGProps } from 'react';

import { cn } from '@/js/lib/utils';

export type GameIconName =
  | 'home'
  | 'workout'
  | 'collection'
  | 'team'
  | 'menu'
  | 'missions'
  | 'ranking'
  | 'explore'
  | 'admin'
  | 'pokeball'
  | 'shiny'
  | 'back'
  | 'capture'
  | 'dex';

type GameIconProps = {
  name: GameIconName;
  size?: number;
  className?: string;
};

const pixelProps: SVGProps<SVGSVGElement> = {
  shapeRendering: 'crispEdges',
  xmlns: 'http://www.w3.org/2000/svg',
};

const icons: Record<GameIconName, SVGProps<SVGSVGElement>['children']> = {
  pokeball: (
    <>
      <rect fill="currentColor" height="2" width="14" x="1" y="1" />
      <rect fill="currentColor" height="12" width="2" x="1" y="3" />
      <rect fill="currentColor" height="12" width="2" x="13" y="3" />
      <rect fill="currentColor" height="2" width="14" x="1" y="13" />
      <rect fill="#f5f7ff" height="5" width="10" x="3" y="3" />
      <rect fill="currentColor" height="2" width="10" x="3" y="7" />
      <rect fill="currentColor" height="4" width="2" x="7" y="3" />
      <rect fill="#f5f7ff" height="2" width="2" x="7" y="9" />
    </>
  ),
  home: (
    <>
      <rect fill="currentColor" height="2" width="10" x="3" y="2" />
      <rect fill="currentColor" height="2" width="2" x="3" y="4" />
      <rect fill="currentColor" height="2" width="2" x="11" y="4" />
      <rect fill="currentColor" height="6" width="10" x="3" y="6" />
      <rect fill="#f5f7ff" height="4" width="4" x="6" y="8" />
      <rect fill="currentColor" height="2" width="14" x="1" y="12" />
    </>
  ),
  workout: (
    <>
      <rect fill="currentColor" height="2" width="4" x="1" y="5" />
      <rect fill="currentColor" height="2" width="4" x="11" y="5" />
      <rect fill="currentColor" height="2" width="8" x="4" y="4" />
      <rect fill="currentColor" height="2" width="2" x="3" y="6" />
      <rect fill="currentColor" height="2" width="2" x="11" y="6" />
      <rect fill="currentColor" height="4" width="2" x="2" y="8" />
      <rect fill="currentColor" height="4" width="2" x="12" y="8" />
      <rect fill="currentColor" height="2" width="6" x="5" y="10" />
    </>
  ),
  collection: (
    <>
      <rect fill="currentColor" height="2" width="12" x="2" y="1" />
      <rect fill="currentColor" height="10" width="2" x="2" y="3" />
      <rect fill="currentColor" height="10" width="2" x="12" y="3" />
      <rect fill="currentColor" height="2" width="12" x="2" y="11" />
      <rect fill="#f4d35e" height="2" width="6" x="5" y="4" />
      <rect fill="#f5f7ff" height="2" width="4" x="6" y="7" />
      <rect fill="#7ae582" height="2" width="2" x="5" y="10" />
      <rect fill="#5bc0eb" height="2" width="2" x="9" y="10" />
    </>
  ),
  team: (
    <>
      <rect fill="currentColor" height="2" width="2" x="2" y="3" />
      <rect fill="currentColor" height="6" width="2" x="2" y="5" />
      <rect fill="currentColor" height="2" width="4" x="2" y="11" />
      <rect fill="currentColor" height="2" width="2" x="12" y="3" />
      <rect fill="currentColor" height="6" width="2" x="12" y="5" />
      <rect fill="currentColor" height="2" width="4" x="10" y="11" />
      <rect fill="currentColor" height="2" width="6" x="5" y="7" />
      <rect fill="#f5f7ff" height="4" width="4" x="6" y="3" />
    </>
  ),
  menu: (
    <>
      <rect fill="currentColor" height="2" width="10" x="3" y="3" />
      <rect fill="currentColor" height="2" width="10" x="3" y="7" />
      <rect fill="currentColor" height="2" width="10" x="3" y="11" />
    </>
  ),
  missions: (
    <>
      <rect fill="currentColor" height="2" width="10" x="4" y="1" />
      <rect fill="currentColor" height="2" width="2" x="3" y="3" />
      <rect fill="currentColor" height="8" width="2" x="3" y="5" />
      <rect fill="currentColor" height="2" width="8" x="5" y="5" />
      <rect fill="#f4d35e" height="2" width="6" x="5" y="7" />
      <rect fill="#f5f7ff" height="2" width="4" x="5" y="9" />
      <rect fill="currentColor" height="2" width="2" x="11" y="3" />
      <rect fill="currentColor" height="4" width="2" x="11" y="5" />
    </>
  ),
  ranking: (
    <>
      <rect fill="currentColor" height="2" width="6" x="5" y="2" />
      <rect fill="currentColor" height="2" width="2" x="5" y="4" />
      <rect fill="currentColor" height="4" width="2" x="5" y="6" />
      <rect fill="currentColor" height="2" width="4" x="3" y="10" />
      <rect fill="#f4d35e" height="6" width="2" x="3" y="4" />
      <rect fill="#b8c4e8" height="4" width="2" x="11" y="6" />
      <rect fill="#c9a227" height="8" width="2" x="7" y="2" />
      <rect fill="currentColor" height="2" width="8" x="4" y="12" />
    </>
  ),
  explore: (
    <>
      <rect fill="#7ae582" height="2" width="2" x="2" y="10" />
      <rect fill="#7ae582" height="4" width="2" x="4" y="8" />
      <rect fill="#7ae582" height="6" width="2" x="6" y="6" />
      <rect fill="#7ae582" height="8" width="2" x="8" y="4" />
      <rect fill="#7ae582" height="6" width="2" x="10" y="6" />
      <rect fill="#7ae582" height="4" width="2" x="12" y="8" />
      <rect fill="currentColor" height="2" width="4" x="1" y="12" />
      <rect fill="currentColor" height="2" width="6" x="9" y="12" />
      <rect fill="#f4d35e" height="2" width="2" x="7" y="2" />
    </>
  ),
  admin: (
    <>
      <rect fill="currentColor" height="10" width="2" x="7" y="3" />
      <rect fill="currentColor" height="2" width="10" x="3" y="7" />
      <rect fill="currentColor" height="2" width="4" x="2" y="2" />
      <rect fill="currentColor" height="2" width="4" x="10" y="2" />
      <rect fill="#f4d35e" height="2" width="2" x="2" y="2" />
      <rect fill="#f4d35e" height="2" width="2" x="12" y="2" />
    </>
  ),
  shiny: (
    <>
      <rect fill="#f4d35e" height="2" width="2" x="7" y="1" />
      <rect fill="#f4d35e" height="2" width="2" x="3" y="3" />
      <rect fill="#f4d35e" height="2" width="2" x="11" y="3" />
      <rect fill="#f4d35e" height="2" width="2" x="1" y="7" />
      <rect fill="#f4d35e" height="2" width="2" x="13" y="7" />
      <rect fill="#f4d35e" height="2" width="2" x="3" y="11" />
      <rect fill="#f4d35e" height="2" width="2" x="11" y="11" />
      <rect fill="#fff" height="2" width="2" x="7" y="7" />
    </>
  ),
  capture: (
    <>
      <rect fill="currentColor" height="2" width="12" x="2" y="2" />
      <rect fill="currentColor" height="8" width="2" x="2" y="4" />
      <rect fill="currentColor" height="8" width="2" x="12" y="4" />
      <rect fill="currentColor" height="2" width="4" x="6" y="6" />
      <rect fill="#f4d35e" height="2" width="2" x="4" y="8" />
      <rect fill="#f4d35e" height="2" width="2" x="10" y="8" />
    </>
  ),
  dex: (
    <>
      <rect fill="#e85d4c" height="12" width="10" x="3" y="2" />
      <rect fill="#f5f7ff" height="8" width="6" x="5" y="4" />
      <rect fill="currentColor" height="2" width="2" x="7" y="2" />
      <rect fill="#5bc0eb" height="2" width="4" x="6" y="6" />
      <rect fill="#7ae582" height="2" width="2" x="5" y="9" />
    </>
  ),
  back: (
    <>
      <rect fill="currentColor" height="2" width="2" x="2" y="7" />
      <rect fill="currentColor" height="2" width="2" x="4" y="7" />
      <rect fill="currentColor" height="2" width="2" x="6" y="7" />
      <rect fill="currentColor" height="2" width="2" x="4" y="5" />
      <rect fill="currentColor" height="2" width="2" x="6" y="9" />
      <rect fill="currentColor" height="2" width="2" x="8" y="5" />
      <rect fill="currentColor" height="2" width="2" x="8" y="7" />
      <rect fill="currentColor" height="2" width="2" x="8" y="9" />
    </>
  ),
};

const GameIcon = ({ name, size = 20, className }: GameIconProps) => {
  return (
    <svg
      aria-hidden={name !== 'back'}
      className={cn('inline-block shrink-0', className)}
      height={size}
      role={name === 'back' ? 'img' : 'presentation'}
      viewBox="0 0 16 16"
      width={size}
      {...pixelProps}
    >
      {icons[name]}
    </svg>
  );
};

export default GameIcon;
