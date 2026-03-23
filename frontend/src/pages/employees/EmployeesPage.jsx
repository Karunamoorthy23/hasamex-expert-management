import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEmployees } from '../../api/employees';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/experts/Pagination';
import Button from '../../components/ui/Button';
import EmployeesTable from '../../components/employees/EmployeesTable';

const LIMIT = 20;

export default function EmployeesPage() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await fetchEmployees({ page, limit: LIMIT, search });
            if (!cancelled) setData(res);
        })();
        return () => { cancelled = true; };
    }, [page, search, refreshKey]);

    const employees = useMemo(() => (data?.data || []), [data]);
    const meta = data?.meta || { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT };

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Employees</h1>
                <p className="page-subtitle">Internal team directory</p>
            </div>

            <div className="card">
                <div className="action-bar">
                    <div className="search-wrapper">
                        <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search employees..."
                            className="search-input"
                        />
                    </div>
                    <div className="action-bar__divider" aria-hidden="true" />
                    <div className="action-bar__actions">
                        <Button variant="primary" onClick={() => navigate('/employees/new')}>
                            + Add Employee
                        </Button>
                        <Button variant="ghost" onClick={() => setRefreshKey((k) => k + 1)}>
                            Refresh
                        </Button>
                    </div>
                </div>

                {!employees.length ? (
                    <Loader rows={8} />
                ) : (
                    <EmployeesTable employees={employees} onEdit={(id) => navigate(`/employees/${id}/edit`)} />
                )}

                <Pagination
                    currentPage={meta.current_page}
                    totalPages={meta.total_pages}
                    onChange={setPage}
                />
            </div>
        </>
    );
}
