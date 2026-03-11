import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import PageShell from '../components/layout/PageShell';

/**
 * App — root layout component.
 * Renders Header + PageShell with router outlet for child pages.
 */
export default function App() {
    return (
        <>
            <Header />
            <PageShell>
                <Outlet />
            </PageShell>
        </>
    );
}
