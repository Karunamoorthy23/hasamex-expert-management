import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import App from './App';
import ExpertsPage from '../pages/experts/ExpertsPage';
import ExpertCreatePage from '../pages/experts/ExpertCreatePage';
import ExpertEditPage from '../pages/experts/ExpertEditPage';
import ClientsPage from '../pages/clients/ClientsPage';
import UsersPage from '../pages/users/UsersPage';
import ProjectsPage from '../pages/projects/ProjectsPage';
import ProjectCreatePage from '../pages/projects/ProjectCreatePage';
import ProjectEditPage from '../pages/projects/ProjectEditPage';
import ClientCreatePage from '../pages/clients/ClientCreatePage';
import ClientEditPage from '../pages/clients/ClientEditPage';
import UserCreatePage from '../pages/users/UserCreatePage';
import UserEditPage from '../pages/users/UserEditPage';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

/**
 * Application router configuration.
 * Uses React Router v6 with createBrowserRouter.
 */
const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
    },
    {
        path: '/reset-password',
        element: <ResetPasswordPage />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <App />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <ExpertsPage />,
            },
            {
                path: 'clients',
                element: <ClientsPage />,
            },
            {
                path: 'clients/new',
                element: <ClientCreatePage />,
            },
            {
                path: 'clients/:id/edit',
                element: <ClientEditPage />,
            },
            {
                path: 'users',
                element: <UsersPage />,
            },
            {
                path: 'users/new',
                element: <UserCreatePage />,
            },
            {
                path: 'users/:id/edit',
                element: <UserEditPage />,
            },
            {
                path: 'projects',
                element: <ProjectsPage />,
            },
            {
                path: 'projects/new',
                element: <ProjectCreatePage />,
            },
            {
                path: 'projects/:id/edit',
                element: <ProjectEditPage />,
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
