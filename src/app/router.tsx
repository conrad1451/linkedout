import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './Layout';
import { ImportsPage } from '../features/import/ImportsPage';
import { RawBrowserPage } from '../features/raw/RawBrowserPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { ActivityPage } from '../features/activity/ActivityPage';
import { MessagesPage } from '../features/messages/MessagesPage';
import { NetworkPage } from '../features/network/NetworkPage';
import { JobsPage } from '../features/jobs/JobsPage';

const isExtension = Boolean(import.meta.env.VITE_EXTENSION);

const routes = [
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: ImportsPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'activity', Component: ActivityPage },
      { path: 'imports', Component: ImportsPage },
      { path: 'category/profile', Component: ProfilePage },
      { path: 'category/messages/:conversationId?', Component: MessagesPage },
      { path: 'category/network', Component: NetworkPage },
      { path: 'category/jobs', Component: JobsPage },
      { path: 'raw', Component: RawBrowserPage },
      { path: 'raw/:datasetId', Component: RawBrowserPage },
    ],
  },
];

const router = isExtension ? createHashRouter(routes) : createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
