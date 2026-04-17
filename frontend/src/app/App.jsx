import { useState, useEffect } from 'react';
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
    
    // Theme toggle state
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('app-theme') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => {
            const newTheme = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('app-theme', newTheme);
            return newTheme;
        });
    };

    const navItems = [
        { id: 'clients', label: 'Clients', iconClass: 'fa-solid fa-desktop', to: '/clients' },
        { id: 'users', label: 'Users', iconClass: 'fa-regular fa-id-badge', to: '/users' },
        { id: 'projects', label: 'Projects', iconClass: 'fa-regular fa-folder', to: '/projects' },
        {
            id: 'experts',
            label: 'Experts',
            iconClass: 'fa-solid fa-database',
            to: '/',
        },
        { id: 'engagements', label: 'Engagements', iconClass: 'fa-solid fa-phone-volume', to: '/engagements' },
        { id: 'leads', label: 'Leads', iconClass: 'fa-solid fa-crosshairs', to: '/leads' },
        { id: 'chatbot', label: 'Chatbot', iconClass: 'fa-regular fa-comments', to: '/chatbot' },
        // { id: 'leads', label: 'Leads', iconClass: 'fa-solid fa-crosshairs' },
        // { id: 'candidates', label: 'Candidates', iconClass: 'fa-solid fa-user-plus' },

    ];

    return (
        <>
            <style>{`
                :root {
                    --bg-app: #000000;
                    --text-app: #ffffff;
                    --border-app: #3a3a3a;
                    --accent: #8b1a1a;
                    --sidebar-bg: #000000;
                    --sidebar-hover: #1e1e1e;
                    --sidebar-active-bg: #ffffff;
                    --sidebar-active-text: #000000;
                    --footer-text: #d0d0d0;
                    --table-bg: #0c0c0c;
                    --table-th-bg: #111111;
                    --table-hover: #1a1a1a;
                    --filter-panel-bg: #0c0c0c;
                }
                
                :root[data-theme="light"] {
                    --bg-app: #ffffff;
                    --text-app: #000000;
                    --border-app: #dddddd;
                    --sidebar-bg: #f8f9fb;
                    --sidebar-hover: #e8eaed;
                    --sidebar-active-bg: #e8eaed;
                    --sidebar-active-text: #000000;
                    --footer-text: #666666;
                    --table-bg: #ffffff;
                    --table-th-bg: #f5f5f5;
                    --table-hover: #f9fafb;
                    --filter-panel-bg: #fafafa;
                }

                /* Globals overridden to enforce theme */
                body, html {
                    background: var(--bg-app) !important;
                    color: var(--text-app) !important;
                }
                .dashboard {
                    background: var(--bg-app);
                    color: var(--text-app);
                }
                .sidebar {
                    background: var(--sidebar-bg);
                    color: var(--text-app);
                    border-right: 1px solid var(--border-app);
                }
                .brand .brand-logo img {
                    filter: ${theme === 'dark' ? 'brightness(0) invert(1)' : 'none'};
                }
                .toggle-btn {
                    color: var(--text-app);
                    background: transparent;
                }
                .nav-menu .nav-item {
                    color: var(--text-app);
                    background: transparent;
                }
                .nav-menu .nav-item:hover {
                    background: var(--sidebar-hover);
                    border-radius: 3px;
                }
                .nav-menu .nav-item.active {
                    background: var(--sidebar-active-bg);
                    color: var(--sidebar-active-text);
                    border-radius: 3px;
                }
                .main-content {
                    background: var(--bg-app);
                    color: var(--text-app);
                    display: flex;
                    flex-direction: column;
                }
                /* Also ensure App-level resets or component backgrounds are synced */
                .main {
                    background-color: var(--bg-app) !important;
                    background-image: none !important; /* overrides components.css background img */
                }
                .main-content .container {
                    background: transparent;
                    color: var(--text-app);
                    width: 100%;
                    max-width: var(--container-max);
                    margin: 0 auto;
                    flex: 1;
                }
                .header {
                    background: var(--bg-app) !important;
                    color: var(--text-app) !important;
                    border-bottom: 1px solid var(--border-app);
                }
                .logo { color: var(--text-app) !important; }
                .nav__link { color: var(--text-app) !important; }
                .page-title, .page-subtitle { color: var(--text-app) !important; }
                
                .footer {
                    background: var(--bg-app);
                    border-top: 1px solid var(--border-app);
                }
                .footer__text {
                    color: var(--footer-text);
                }
                
                /* Component overrides */
                .card {
                    background: var(--table-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                .data-table { 
                    color: var(--text-app) !important; 
                    background: var(--table-bg) !important; 
                }
                .data-table th, .data-table td { 
                    border-color: var(--border-app) !important; 
                    background: transparent !important;
                }
                .data-table tbody tr {
                    background: var(--table-bg) !important;
                }
                .data-table tbody tr:hover, .data-table tbody tr:hover td { 
                    background: var(--table-hover) !important; 
                }
                .data-table th { 
                    background: var(--table-th-bg) !important; 
                    color: var(--text-app) !important; 
                }
                .expert-name { color: var(--text-app) !important; }

                /* Filter and Actions bar overrides */
                .action-bar, .bulk-bar, .view-toggle-row {
                    background: var(--table-bg) !important;
                    border-color: var(--border-app) !important;
                }
                .filters-panel {
                    background: var(--filter-panel-bg) !important;
                    border-color: var(--border-app) !important;
                }
                .fd__trigger, .filter-input, .ms__search, .ms__list {
                    background: var(--table-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                .ms__item:hover {
                    background: var(--table-hover) !important;
                }
                .ms__value, .filters-panel__title, .filters-panel__subtitle, .fd__label, .bulk-bar__count {
                    color: var(--text-app) !important;
                }
                .btn--ghost {
                    color: var(--text-app) !important;
                }
                .btn--ghost:hover {
                    color: #000000 !important;
                }
                .filters-panel__close {
                    background: var(--table-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                .filters-panel__close:hover {
                    background: var(--table-hover) !important;
                }
                .fd__popover {
                    background: var(--table-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                .pagination {
                    background: var(--table-bg) !important;
                    border-color: var(--border-app) !important;
                }
                .pagination__btn {
                    background: var(--table-th-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                .pagination__btn:hover:not(:disabled) {
                    background: var(--table-hover) !important;
                }
                .pagination__info {
                    color: var(--text-app) !important;
                }
                
                /* Form Overrides for Create/Edit Pages */
                .form-section {
                    border-bottom-color: var(--border-app) !important;
                }
                .form-section__title {
                    color: var(--text-app) !important;
                }
                .form-section__title::before {
                    background: var(--text-app) !important;
                }
                .form-label {
                    color: var(--text-app) !important;
                }
                .form-input, .form-select, .form-textarea {
                    background: var(--table-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                .form-input:focus, .form-select:focus, .form-textarea:focus {
                    border-color: #3b82f6 !important; /* soft blue for focus ring */
                }
                
                /* Timezone Select Overrides */
                .tz-select__trigger, .tz-select__search, .tz-select__dropdown, .tz-select__list {
                    background: var(--table-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                .tz-select__item:hover {
                    background: var(--table-hover) !important;
                }
                .tz-select__value, .tz-select__placeholder, .tz-select__group-label, .tz-select__item-label {
                    color: var(--text-app) !important;
                }
                
                /* File Upload Overrides */
                .file-upload-wrapper, .file-preview, .file-upload-label {
                    background: var(--table-bg) !important;
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }

                /* Employment History Builder Overrides */
                .eh-card {
                    background: var(--table-bg) !important;
                    border: 1px solid var(--border-app) !important;
                }
                .eh-card-header {
                    border-bottom: 1px solid var(--border-app) !important;
                }
                .eh-card-title {
                    color: var(--text-app) !important;
                }
                .empty-state__text {
                    color: var(--text-app) !important;
                    border-color: var(--border-app) !important;
                }
                
            `}</style>
            <div className="dashboard" data-theme={theme}>
            <aside className={cn('sidebar', collapsed && 'collapsed')}>
                <div className="brand">
                    <h2 className="brand-logo">
                        <img src={logo} alt="Hasamex" height={20} />
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

                <div style={{ padding: 'var(--space-4)', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        type="button"
                        className="nav-item"
                        onClick={toggleTheme}
                    >
                        <i className={theme === 'dark' ? "fa-solid fa-sun" : "fa-solid fa-moon"} aria-hidden="true" />
                        <span className="nav-text">{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                    </button>
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
