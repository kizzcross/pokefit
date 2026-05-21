import { createBrowserRouter, Navigate } from 'react-router';

import AuthGuard from '@/js/app/AuthGuard';
import GameShell from '@/js/app/GameShell';
import LoginPage from '@/js/pages/auth/LoginPage';
import CapturePage from '@/js/pages/capture/CapturePage';
import CaptureSuccessPage from '@/js/pages/capture/CaptureSuccessPage';
import CollectionPage from '@/js/pages/collection/CollectionPage';
import DashboardPage from '@/js/pages/dashboard/DashboardPage';
import EncounterPage from '@/js/pages/encounter/EncounterPage';
import MissionsPage from '@/js/pages/missions/MissionsPage';
import MorePage from '@/js/pages/more/MorePage';
import PokemonDetailPage from '@/js/pages/pokemon/PokemonDetailPage';
import RankingPage from '@/js/pages/ranking/RankingPage';
import TeamPage from '@/js/pages/team/TeamPage';
import WorkoutDetailPage from '@/js/pages/workout/WorkoutDetailPage';
import WorkoutsListPage from '@/js/pages/workout/WorkoutsListPage';
import WorkoutNewPage from '@/js/pages/workout/WorkoutNewPage';
import ExerciseCreatePage from '@/js/pages/exercises/ExerciseCreatePage';
import ExerciseEditPage from '@/js/pages/exercises/ExerciseEditPage';
import ExerciseListPage from '@/js/pages/exercises/ExerciseListPage';
import CalendarPage from '@/js/pages/calendar/CalendarPage';
import FriendsPage from '@/js/pages/friends/FriendsPage';
import FriendProfilePage from '@/js/pages/friends/FriendProfilePage';
import TimelinePage from '@/js/pages/timeline/TimelinePage';
import ProfilePage from '@/js/pages/profile/ProfilePage';
import GiftsInboxPage from '@/js/pages/gifts/GiftsInboxPage';
import GiftSendPage from '@/js/pages/gifts/GiftSendPage';

const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <GameShell />
      </AuthGuard>
    ),
    children: [
      { index: true, Component: DashboardPage },
      { path: 'workouts', Component: WorkoutsListPage },
      { path: 'workout/new', Component: WorkoutNewPage },
      { path: 'workout/:id', Component: WorkoutDetailPage },
      { path: 'encounter', Component: EncounterPage },
      { path: 'capture', Component: CapturePage },
      { path: 'capture/success', Component: CaptureSuccessPage },
      { path: 'collection', Component: CollectionPage },
      { path: 'pokemon/:id', Component: PokemonDetailPage },
      { path: 'team', Component: TeamPage },
      { path: 'calendar', Component: CalendarPage },
      { path: 'timeline', Component: TimelinePage },
      { path: 'friends', Component: FriendsPage },
      { path: 'friends/:id', Component: FriendProfilePage },
      { path: 'missions', Component: MissionsPage },
      { path: 'ranking', Component: RankingPage },
      { path: 'more', Component: MorePage },
      { path: 'gifts', Component: GiftsInboxPage },
      { path: 'admin/gifts/send', Component: GiftSendPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'exercises', Component: ExerciseListPage },
      { path: 'exercises/new', Component: ExerciseCreatePage },
      { path: 'exercises/:id/edit', Component: ExerciseEditPage },
      { path: 'admin/exercises/new', Component: ExerciseCreatePage },
    ],
  },
  { path: '*', element: <Navigate replace to="/" /> },
]);

export default router;
