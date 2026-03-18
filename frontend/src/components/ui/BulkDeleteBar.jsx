import Button from './Button';
import { TrashIcon } from '../icons/Icons';

export default function BulkDeleteBar({ count, onDelete, onClear, label = 'selected' }) {
    if (count === 0) return null;

    return (
        <div className="bulk-bar">
            <span className="bulk-bar__count">
                {count} {label}
            </span>
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

