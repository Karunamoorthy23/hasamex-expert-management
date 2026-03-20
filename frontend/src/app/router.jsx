import { createBrowserRouter, Link } from 'react-router-dom';
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
import ProjectDetails from '../pages/projects/ProjectDetails';
import ClientCreatePage from '../pages/clients/ClientCreatePage';
import ClientEditPage from '../pages/clients/ClientEditPage';
import ClientDetails from '../pages/clients/ClientDetails';
import UserCreatePage from '../pages/users/UserCreatePage';
import UserEditPage from '../pages/users/UserEditPage';
import UserDetails from '../pages/users/UserDetails';
import EngagementDashboardPage from '../pages/EngagementDashboardPage';
import EngagementEditPage from '../pages/engagements/EngagementEditPage';
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
        errorElement: (
            <div className="container" style={{ padding: '40px 0' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <h2 className="page-title" style={{ margin: 0 }}>Page not found</h2>
                    <p className="page-subtitle">Use the navigation to find your way, or go back home.</p>
                    <div style={{ marginTop: 16 }}>
                        <Link to="/" className="action-btn">Go to Dashboard</Link>
                    </div>
                </div>
            </div>
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
                path: 'clients/:id',
                element: <ClientDetails />,
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
                path: 'users/:id',
                element: <UserDetails />,
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
                path: 'projects/:id',
                element: <ProjectDetails />,
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
                path: 'engagements',
                element: <EngagementDashboardPage />,
            },
            {
                path: 'engagements/new',
                element: <EngagementEditPage />,
            },
            {
                path: 'engagements/:id/edit',
                element: <EngagementEditPage />,
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
