import Checkbox from '../ui/Checkbox';
import { truncate } from '../../utils/format';
import { EditIcon, TrashIcon, LinkIcon, MailIcon } from '../icons/Icons';

/**
 * ExpertsTable — data table for expert list view.
 * Maps from: <div id="tableView" class="table-container"> in index.html
 *
 * @param {Object} props
 * @param {Array} props.experts - Array of expert objects
 * @param {Set} props.selectedIds - Set of selected expert IDs
 * @param {Function} props.onSelectExpert - Toggle selection for one expert
 * @param {Function} props.onSelectAll - Toggle select all on current page
 * @param {boolean} props.allSelected - Whether all on page are selected
 * @param {Function} props.onViewExpert - Open expert detail modal
 * @param {Function} props.onEditExpert - Navigate to edit page
 * @param {Function} props.onDeleteExpert - Trigger delete confirmation
 */
export default function ExpertsTable({
    experts,
    selectedIds,
    onSelectExpert,
    onSelectAll,
    allSelected,
    onViewExpert,
    onEditExpert,
    onDeleteExpert,
    onEmailExpert,
}) {
    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="col-check">
                            <Checkbox
                                id="selectAll"
                                checked={allSelected}
                                onChange={onSelectAll}
                                ariaLabel="Select all"
                            />
                        </th>
                        <th className="col-id">Expert ID</th>
                        <th className="col-name">Name</th>
                        <th className="col-title">Title / Headline</th>
                        <th className="col-sector">Sector</th>
                        <th className="col-region">Region</th>
                        <th className="col-status">Status</th>
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {experts.map((expert) => (
                        <tr key={expert.id}>
                            <td className="col-check">
                                <Checkbox
                                    checked={selectedIds.has(expert.id)}
                                    onChange={() => onSelectExpert(expert.id)}
                                />
                            </td>
                            <td className="col-id">{expert.expert_id}</td>
                            <td className="col-name">
                                <a
                                    href="#"
                                    className="expert-name"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onViewExpert(expert.id);
                                    }}
                                >
                                    {expert.first_name} {expert.last_name}
                                </a>
                            </td>
                            <td className="col-title">{truncate(expert.title_headline, 50)}</td>
                            <td className="col-sector">{expert.primary_sector || '—'}</td>
                            <td className="col-region">{expert.region || '—'}</td>
                            <td className="col-status">{expert.expert_status || '—'}</td>
                            <td className="col-actions">
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    {expert.linkedin_url && (
                                        <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer" className="action-btn" title="LinkedIn">
                                            <LinkIcon />
                                        </a>
                                    )}
                                    <button type="button" className="action-btn" title="Email Info" onClick={() => onEmailExpert(expert.id)}>
                                        <MailIcon />
                                    </button>
                                    <button type="button" className="action-btn" title="Edit" onClick={() => onEditExpert(expert.id)}>
                                        <EditIcon />
                                    </button>
                                    <button type="button" className="action-btn action-btn--danger" title="Delete" onClick={() => onDeleteExpert(expert)}>
                                        <TrashIcon />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
