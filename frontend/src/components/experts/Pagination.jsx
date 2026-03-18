/**
 * Pagination — page navigation using API meta.
 * Maps from: <div class="pagination"> in index.html
 *
 * @param {Object} props
 * @param {number} props.page - Current page (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalRecords - Total number of records
 * @param {Function} props.onPageChange - Callback with next page number
 * @param {string} [props.itemLabel='experts'] - Label for records count
 */
export default function Pagination({ page, totalPages, totalRecords, onPageChange, itemLabel = 'experts' }) {
    return (
        <div className="pagination">
            <button
                type="button"
                className="pagination__btn"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
            >
                Previous
            </button>
            <div className="pagination__info">
                <span>
                    Page {page} of {totalPages} ({totalRecords} {itemLabel})
                </span>
            </div>
            <button
                type="button"
                className="pagination__btn"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                Next
            </button>
        </div>
    );
}
