import { cn } from '../../utils/cn';

function statusBadgeClass(status) {
    if (!status) return 'badge badge-active';
    const val = String(status).toLowerCase();
    if (val === 'active') return 'badge badge-active';
    if (val === 'planning') return 'badge badge-planning';
    return 'badge badge-outline-theme';
}

export default function ClientProjectsTable({ projects = [] }) {
    if (!projects.length) {
        return <p className="empty-state__text">No projects found for this client.</p>;
    }

    return (
        <div className="client-nested-table">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>PROJECT</th>
                        <th>SECTOR</th>
                        <th>STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((p) => (
                        <tr key={p.project_id}>
                            <td>
                                <div className="client-project-title">{p.title}</div>
                                <div className="client-project-subtitle">{p.description || 'N/A'}</div>
                            </td>
                            <td>{p.sector || 'N/A'}</td>
                            <td>
                                <span className={cn(statusBadgeClass(p.status))}>{p.status || 'N/A'}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

