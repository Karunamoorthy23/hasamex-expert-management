import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function LeadsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const active = useMemo(() => {
        const p = (location.pathname || '').replace(/\/+$/, '');
        if (p.includes('/leads/experts')) return 'experts';
        if (p.includes('/leads/candidates')) return 'candidates';
        if (p.includes('/leads/clients')) return 'clients';
        return 'clients';
    }, [location.pathname]);

    return (
        <>
            <style>{`
                .l-tabs-wrap {
                    border-bottom: 1px solid var(--border-color, #e0e0e0);
                    padding: 0 16px;
                    background: #fff;
                }
                .l-tabs {
                    display: flex;
                    gap: 6px;
                    align-items: stretch;
                    position: relative;
                }
                .l-tab {
                    appearance: none;
                    border: none;
                    background: transparent;
                    padding: 12px 14px;
                    font-size: 0.92rem;
                    font-weight: 700;
                    color: #5a5f6a;
                    letter-spacing: 0.01em;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: color .2s ease, background-color .2s ease, border-color .2s ease;
                    border-radius: 6px 6px 0 0;
                }
                .l-tab:hover {
                    color: #1a1a1a;
                    background: #f6f7f9;
                }
                .l-tab--active {
                    color: #111111;
                    border-bottom-color: #1a5ca8;
                    background: #ffffff;
                }
            `}</style>
            <div className="page-header">
                <h1 className="page-title">Leads</h1>
            </div>
            <div className="card" style={{ paddingTop: 0 }}>
                <div className="l-tabs-wrap">
                    <div className="l-tabs" role="tablist" aria-label="Lead types">
                    <button
                        className={`l-tab${active === 'clients' ? ' l-tab--active' : ''}`}
                        role="tab"
                        aria-selected={active === 'clients'}
                        aria-controls="panel-clients"
                        onClick={() => navigate('/leads/clients')}
                    >
                        Clients
                    </button>
                    <button
                        className={`l-tab${active === 'experts' ? ' l-tab--active' : ''}`}
                        role="tab"
                        aria-selected={active === 'experts'}
                        aria-controls="panel-experts"
                        onClick={() => navigate('/leads/experts')}
                    >
                        Experts
                    </button>
                    <button
                        className={`l-tab${active === 'candidates' ? ' l-tab--active' : ''}`}
                        role="tab"
                        aria-selected={active === 'candidates'}
                        aria-controls="panel-candidates"
                        onClick={() => navigate('/leads/candidates')}
                    >
                        Candidates
                    </button>
                    </div>
                </div>
                <div style={{ padding: 16 }} id={`panel-${active}`} role="tabpanel">
                    <Outlet />
                </div>
            </div>
        </>
    );
}
