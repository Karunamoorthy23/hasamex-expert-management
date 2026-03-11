import Button from '../ui/Button';
import { TrashIcon } from '../icons/Icons';

/**
 * BulkActionsBar — shows when experts are selected.
 * Maps from: <div id="bulkBar" class="bulk-bar"> in index.html
 *
 * @param {Object} props
 * @param {number} props.count - Number of selected items
 * @param {Function} props.onEmail - Email view action
 * @param {Function} props.onExportSelected - Export selected action
 * @param {Function} props.onDelete - Bulk delete action
 * @param {Function} props.onClear - Clear selection
 */
export default function BulkActionsBar({ count, onEmail, onExportSelected, onDelete, onClear }) {
    if (count === 0) return null;

    return (
        <div className="bulk-bar">
            <span className="bulk-bar__count">{count} selected</span>
            <Button variant="secondary" size="sm" onClick={onEmail}>
                Email View
            </Button>
            <Button variant="secondary" size="sm" onClick={onExportSelected}>
                Export Selected
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="btn--destructive"
            >
                <TrashIcon width={14} height={14} />
                Delete Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear}>
                Clear
            </Button>
        </div>
    );
}
