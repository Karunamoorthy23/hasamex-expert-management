import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '/src/assets/hasamex_logo.png';
import { cn } from '../utils/cn';
import { clearToken } from '../auth/token';

/**
 * App — root layout with Hasamex-style sidebar navigation.
 * Uses a collapsible left sidebar with section tabs (Clients, Users, Projects, Experts, etc).
 * When "Experts" is selected, the expert management UI (current routes) is rendered in the main area.
 */
export default function App() {
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { id: 'clients', label: 'Clients', iconClass: 'fa-solid fa-desktop', to: '/clients' },
        { id: 'users', label: 'Users', iconClass: 'fa-regular fa-id-badge', to: '/users' },
        { id: 'projects', label: 'Projects', iconClass: 'fa-regular fa-folder', to: '/projects' },
        {
            id: 'experts',
            label: 'Experts',
            iconClass: 'fa-solid fa-cube',
            to: '/',
        },
        { id: 'engagements', label: 'Engagements', iconClass: 'fa-solid fa-phone-volume', to: '/engagements' },
        { id: 'employees', label: 'Employees', iconClass: 'fa-regular fa-circle-user' },
        // { id: 'leads', label: 'Leads', iconClass: 'fa-solid fa-crosshairs' },
        // { id: 'candidates', label: 'Candidates', iconClass: 'fa-solid fa-user-plus' },
    ];

    return (
        <>
            <style>{`
                :root {
                    --bg-dark: #000000;
                    --bg-dark-2: #0c0c0c;
                    --text-light: #ffffff;
                    --text-muted: #d0d0d0;
                    --border-dark: #222222;
                    --accent: #8b1a1a;
                }
                body {
                    background: var(--bg-dark);
                    color: var(--text-light);
                }
                .dashboard {
                    background: var(--bg-dark);
                    color: var(--text-light);
                }
                .sidebar {
                    background: var(--bg-dark);
                    color: var(--text-light);
                    border-right: 1px solid var(--border-dark);
                }
                .brand .brand-logo img {
                    filter: brightness(0) invert(1);
                }
                .toggle-btn {
                    color: var(--text-light);
                    background: transparent;
                }
                .nav-menu .nav-item {
                    color: var(--text-light);
                    background: transparent;
                }
                .nav-menu .nav-item:hover {
                    background: #9f9b9bff;
                    border-radius: 3px;
                }
                .nav-menu .nav-item.active {
                    background: #ffffff;
                    color: #000000;
                    border-radius: 3px;
                }
                .main-content {
                    background: var(--bg-dark);
                    color: var(--text-light);
                }
                .main-content .container {
                    background: black;
                    // color: #ffffff;
                    color: black;
                    // border: 1px solid #d8d8d8;
                    // border-radius: 8px;
                    padding: 16px;
                }
                .footer {
                    background: var(--bg-dark);
                    border-top: 1px solid var(--border-dark);
                }
                .footer__text {
                    color: var(--text-muted);
                }
            `}</style>
            <div className="dashboard">
            <aside className={cn('sidebar', collapsed && 'collapsed')}>
                <div className="brand">
                    <h2 className="brand-logo">
                        <img src={logo} alt="Hasamex" height={26} />
                    </h2>
                    <button
                        type="button"
                        className="toggle-btn"
                        onClick={() => setCollapsed((prev) => !prev)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <i className="fa-solid fa-bars" aria-hidden="true" />
                    </button>
                </div>

                <nav className="nav-menu">
                    {navItems.map((item) => {
                        const isActive =
                            item.to &&
                            (item.to === '/'
                                ? location.pathname === '/' || location.pathname.startsWith('/experts')
                                : location.pathname.startsWith(item.to));

                        // Only "Experts" is wired to the React Router for now.
                        if (item.to) {
                            return (
                                <Link
                                    key={item.id}
                                    to={item.to}
                                    className={cn('nav-item', isActive && 'active')}
                                >
                                    <i className={item.iconClass} aria-hidden="true" />
                                    <span className="nav-text">{item.label}</span>
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                type="button"
                                className="nav-item"
                                // Placeholder: other sections can be wired up to routes later.
                                onClick={(e) => e.preventDefault()}
                            >
                                <i className={item.iconClass} aria-hidden="true" />
                                <span className="nav-text">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div style={{ padding: 'var(--space-4)', marginTop: 'auto' }}>
                    <button
                        type="button"
                        className="nav-item"
                        onClick={() => {
                            clearToken();
                            navigate('/login', { replace: true });
                        }}
                    >
                        <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
                        <span className="nav-text">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="container">
                        <Outlet />
                    </div>

                <footer className="footer">
                    <div className="container">
                        <p className="footer__text">
                            Hasamex — Expert Insight Delivered with Speed &amp; Trust
                        </p>
                    </div>
                </footer>
            </main>
        </div>
        </>
    );
}
