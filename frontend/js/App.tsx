import * as Sentry from '@sentry/react';
import { RouterProvider } from 'react-router/dom';

import AppProviders from '@/js/app/AppProviders';
import router from '@/js/routes/index';

const App = () => (
  <AppProviders>
    <Sentry.ErrorBoundary fallback={<p className="p-4 text-white">Um erro ocorreu no app.</p>}>
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  </AppProviders>
);

export default App;
