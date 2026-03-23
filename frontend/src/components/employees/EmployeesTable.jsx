import { EditIcon, LinkIcon } from '../icons/Icons';

export default function EmployeesTable({ employees, onEdit }) {
    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Email</th>
                        <th>Title</th>
                        <th>Role</th>
                        <th>PAN</th>
                        <th>Aadhar</th>
                        <th>Joining</th>
                        <th>LinkedIn</th>
                        <th>Mobile</th>
                        <th>Manager</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(employees || []).map((e) => (
                        <tr key={e.id}>
                            <td>{e.first_name || '—'}</td>
                            <td>{e.last_name || '—'}</td>
                            <td>{e.email || '—'}</td>
                            <td>{e.title || '—'}</td>
                            <td>{e.role || '—'}</td>
                            <td>{e.pan_number || '—'}</td>
                            <td>{e.aadhar_number || '—'}</td>
                            <td>{e.date_of_joining ? new Date(e.date_of_joining).toLocaleDateString() : '—'}</td>
                            <td>
                                {e.linkedin_url ? (
                                    <a href={e.linkedin_url} target="_blank" rel="noreferrer" className="action-btn" title="LinkedIn">
                                        <LinkIcon />
                                    </a>
                                ) : '—'}
                            </td>
                            <td>{e.mobile || '—'}</td>
                            <td>{e.reporting_manager_name || '—'}</td>
                            <td>
                                <button type="button" className="action-btn" title="Edit" onClick={() => onEdit?.(e.id)}>
                                    <EditIcon />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
