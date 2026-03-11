import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import ExpertsPage from '../pages/experts/ExpertsPage';
import ExpertCreatePage from '../pages/experts/ExpertCreatePage';
import ExpertEditPage from '../pages/experts/ExpertEditPage';

/**
 * Application router configuration.
 * Uses React Router v6 with createBrowserRouter.
 */
const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            {
                index: true,
                element: <ExpertsPage />,
            },
            {
                path: 'experts/new',
                element: <ExpertCreatePage />,
            },
            {
                path: 'experts/:id/edit',
                element: <ExpertEditPage />
            },
        ],
    },
]);

export default router;
