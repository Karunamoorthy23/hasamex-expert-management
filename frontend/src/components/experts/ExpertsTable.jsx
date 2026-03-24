import Checkbox from '../ui/Checkbox';
import { truncate } from '../../utils/format';
import { EditIcon, TrashIcon, LinkIcon, MailIcon, SortIcon } from '../icons/Icons';
import { Link } from 'react-router-dom';

/**
 * ExpertsTable — data table for expert list view.
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
    sortBy,
    sortOrder,
    onSort,
}) {
    const renderHeader = (label, column, className) => {
        const isActive = sortBy === column;
        return (
            <th
                className={`${className} sortable-header`}
                onClick={() => onSort(column)}
                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {label}
                    <SortIcon direction={isActive ? sortOrder : null} active={isActive} />
                </div>
            </th>
        );
    };

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
                        {renderHeader('Expert ID', 'expert_id', 'col-id')}
                        {renderHeader('Name', 'first_name', 'col-name')}
                        {renderHeader('Title / Headline', 'title_headline', 'col-title')}
                        {renderHeader('Sector', 'primary_sector', 'col-sector')}
                        {renderHeader('Region', 'region', 'col-region')}
                        <th className="col-solution">Client Solution</th>
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
                                <Link to={`/experts/${expert.id}`} className="expert-name">
                                    {expert.first_name} {expert.last_name}
                                </Link>
                            </td>
                            <td className="col-title">{truncate(expert.title_headline, 50)}</td>
                            <td className="col-sector">{expert.primary_sector || '—'}</td>
                            <td className="col-region">{expert.region || '—'}</td>
                            <td className="col-solution">{expert.client_solution_owner_name || '—'}</td>
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
