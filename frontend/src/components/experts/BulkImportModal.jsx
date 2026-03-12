import { useState, useRef, Fragment } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UploadIcon, DownloadIcon, XIcon, CheckIcon, AlertCircleIcon, InfoIcon } from '../icons/Icons';
import { downloadImportTemplate, previewImport, confirmImport } from '../../api/experts';
import { cn } from '../../utils/cn';

export default function BulkImportModal({ open, onClose, onImportComplete }) {
    const [step, setStep] = useState(1); // 1: Select/Upload, 2: Preview
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});
    const fileInputRef = useRef(null);

    const handleDownloadTemplate = async () => {
        try {
            await downloadImportTemplate();
        } catch (err) {
            setError('Failed to download template. Please try again.');
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
                setError('Please upload an Excel file (.xlsx or .xls)');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handlePreview = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);
        try {
            const result = await previewImport(file);

            const MANDATORY_FIELDS = [
                { excel: 'Expert ID', label: 'Expert ID' },
                { excel: 'First Name', label: 'First Name' },
                { excel: 'Last Name', label: 'Last Name' },
                { excel: 'Primary Email 1', label: 'Primary Email' },
                { excel: 'Primary Phone 1', label: 'Primary Phone' },
                { excel: 'LinkedIn URL', label: 'LinkedIn URL' },
                { excel: 'Title / Headline', label: 'Title / Headline' }
            ];

            // Process and validate records
            const processedData = result.data.map(item => {
                const newData = { ...item.data };
                const missing = [];

                // 1. Check mandatory fields
                MANDATORY_FIELDS.forEach(field => {
                    const val = newData[field.excel];
                    if (!val || (typeof val === 'string' && !val.trim())) {
                        missing.push(field.label);
                    }
                });

                // 2. Clean phone numbers if present
                ['Primary Phone 1', 'Secondary Phone 1'].forEach(key => {
                    if (newData[key] && typeof newData[key] === 'string') {
                        newData[key] = newData[key].replace(/[^\d\s+\-()]/g, '');
                    }
                });

                let status = item.status;
                if (missing.length > 0) {
                    status = 'Missed'; // Using 'Missed' internally for 'Missed Fields'
                }

                return {
                    ...item,
                    status,
                    data: newData,
                    missingFields: missing
                };
            });
            setPreviewData(processedData);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmImport = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            // Filter out internal status 'Missed' (Missed Fields), 'Error', and manually 'skipped' rows
            const validRecords = previewData.filter(r => r.status !== 'Missed' && r.status !== 'Error' && !r.skipped);

            if (validRecords.length === 0) {
                setError('No valid records to import. All records have missing fields, duplicate IDs, duplicates, or were skipped.');
                setIsProcessing(false);
                return;
            }

            const missedCount = previewData.filter(r => r.status === 'Missed').length;
            const errorCount = previewData.filter(r => r.status === 'Error').length;
            const skippedCount = previewData.filter(r => r.skipped && r.status !== 'Missed' && r.status !== 'Error').length;

            const resp = await confirmImport(validRecords);
            setResults({
                ...resp.results,
                missed: missedCount + errorCount,
                skipped: skippedCount
            });
            setStep(3); // Result step
            if (onImportComplete) onImportComplete();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setStep(1);
        setFile(null);
        setPreviewData([]);
        setError(null);
        setResults(null);
        setExpandedRows({});
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleSkip = (id) => {
        setPreviewData(prev => prev.map(row => {
            if (row.id === id) {
                return { ...row, skipped: !row.skipped };
            }
            return row;
        }));
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const renderStep1 = () => (
        <div className="bulk-import-step">
            <div className="bulk-import-options">
                <div className="import-option-card" onClick={handleDownloadTemplate}>
                    <div className="option-icon-wrapper blue">
                        <DownloadIcon width={24} height={24} />
                    </div>
                    <div className="option-content">
                        <h4>Download Template</h4>
                        <p>Get the required Excel format with sample records.</p>
                    </div>
                </div>

                <div className="import-option-card" onClick={() => fileInputRef.current.click()}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                    />
                    <div className="option-icon-wrapper purple">
                        <UploadIcon width={24} height={24} />
                    </div>
                    <div className="option-content">
                        <h4>Upload Excel Sheet</h4>
                        <p>{file ? file.name : 'Select your filled template to process records.'}</p>
                    </div>
                </div>
            </div>

            {error && <div className="import-error-msg">{error}</div>}

            <div className="modal-footer">
                <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                <Button
                    variant="primary"
                    onClick={handlePreview}
                    disabled={!file || isProcessing}
                    loading={isProcessing}
                >
                    Process Records
                </Button>
            </div>
        </div>
    );

    const renderStep2 = () => {
        const newCount = previewData.filter(r => r.status === 'New' && !r.skipped).length;
        const updateCount = previewData.filter(r => r.status === 'Update' && !r.skipped).length;
        const dupCount = previewData.filter(r => r.status === 'Duplicate' && !r.skipped).length;
        const missedCount = previewData.filter(r => r.status === 'Missed').length;
        const errorCount = previewData.filter(r => r.status === 'Error').length;
        const skippedCount = previewData.filter(r => r.skipped).length;

        return (
            <div className="bulk-import-step preview-step">
                <div className="import-summary-chips">
                    <span className="summary-chip new">{newCount} New</span>
                    <span className="summary-chip update">{updateCount} Updates</span>
                    <span className="summary-chip error">{errorCount} Conflicts (Ignored)</span>
                    <span className="summary-chip skipped">{skippedCount} Skipped</span>
                    <span className="summary-chip missed">{missedCount} Missed Fields (Ignored)</span>
                    <span className="summary-chip duplicate">{dupCount} Duplicates (Ignored)</span>
                </div>

                <div className="import-preview-container">
                    <table className="import-preview-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewData.map((row) => (
                                <Fragment key={row.id}>
                                    <tr className={cn(
                                        'row-status',
                                        row.skipped ? 'skipped' : (row.status.toLowerCase() === 'missed' ? 'missed' : row.status.toLowerCase())
                                    )}>
                                        <td>
                                            <span className={cn(
                                                'status-label',
                                                row.skipped ? 'skipped' : (row.status.toLowerCase() === 'missed' ? 'missed' : row.status.toLowerCase())
                                            )}>
                                                {row.skipped ? 'Skipped' : (row.status === 'Missed' ? 'Missed Fields' : row.status)}
                                            </span>
                                        </td>
                                        <td>{row.data['First Name']} {row.data['Last Name']}</td>
                                        <td>{row.data['Primary Email 1']}</td>
                                        <td className="diff-cell">
                                            {row.status === 'Error' && (
                                                <div className="error-message-alert">
                                                    <AlertCircleIcon className="alert-icon" width={14} height={14} />
                                                    <span>{row.message}</span>
                                                </div>
                                            )}
                                            {row.status === 'Missed' && (
                                                <div className="missed-fields-alert">
                                                    <AlertCircleIcon className="alert-icon" width={14} height={14} />
                                                    <span>Missing: <strong>{row.missingFields.join(', ')}</strong></span>
                                                </div>
                                            )}
                                            {row.status === 'Update' && row.differences && (
                                                <div className="diff-list">
                                                    {Object.keys(row.differences).slice(0, 1).map(key => (
                                                        <div key={key} className="diff-item">
                                                            <strong>{key}:</strong> {row.differences[key].old} → {row.differences[key].new}
                                                        </div>
                                                    ))}
                                                    {Object.keys(row.differences).length > 1 && (
                                                        <button
                                                            className="view-more-btn"
                                                            onClick={() => toggleRow(row.id)}
                                                        >
                                                            {expandedRows[row.id] ? 'Show Less' : `+ ${Object.keys(row.differences).length - 1} more changes`}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {row.status === 'Duplicate' && <span className="text-muted">No changes detected</span>}

                                            {/* Skip Toggle Button - Only for records that would otherwise be imported (New/Update) */}
                                            {(row.status === 'New' || row.status === 'Update') && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <button
                                                        className={cn('skip-btn', row.skipped && 'is-skipped')}
                                                        onClick={() => toggleSkip(row.id)}
                                                    >
                                                        {row.skipped ? 'Unskip Record' : 'Skip & Don\'t Import'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedRows[row.id] && row.status === 'Update' && (
                                        <tr key={`expanded-row-${row.id}`} className="expanded-diff-row">
                                            <td colSpan="4">
                                                <div className="expanded-diff-content">
                                                    <h5>Detailed Changes:</h5>
                                                    <div className="diff-grid">
                                                        <div className="diff-grid-header">
                                                            <span>Field</span>
                                                            <span>Current Value (DB)</span>
                                                            <span>New Value (Excel)</span>
                                                        </div>
                                                        {Object.keys(row.differences).map(key => (
                                                            <div key={key} className="diff-grid-row">
                                                                <span className="diff-field-name">{key}</span>
                                                                <span className="diff-old-val">{row.differences[key].old}</span>
                                                                <span className="diff-new-val">{row.differences[key].new}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="modal-footer">
                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <Button
                        variant="primary"
                        onClick={handleConfirmImport}
                        loading={isProcessing}
                        disabled={isProcessing}
                    >
                        Confirm Import
                    </Button>
                </div>
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="bulk-import-step result-step">
            <div className="success-header">
                <div className="success-icon-bg">
                    <CheckIcon width={32} height={32} />
                </div>
                <h3>Import Task Completed</h3>
            </div>

            <div className="result-stats">
                <div className="stat-card">
                    <span className="stat-num">{results?.inserted}</span>
                    <span className="stat-label">Experts Added</span>
                </div>
                <div className="stat-card">
                    <span className="stat-num">{results?.updated}</span>
                    <span className="stat-label">Experts Updated</span>
                </div>
                <div className="stat-card">
                    <span className="stat-num">{results?.ignored}</span>
                    <span className="stat-label">Duplicates Ignored</span>
                </div>
                <div className="stat-card">
                    <span className="stat-num">{results?.skipped || 0}</span>
                    <span className="stat-label">Experts Skipped</span>
                </div>
                <div className="stat-card">
                    <span className="stat-num">{results?.missed}</span>
                    <span className="stat-label">Ignored (Field/ID Issues)</span>
                </div>
            </div>

            {results?.errors?.length > 0 && (
                <div className="import-partial-errors">
                    <h5>Handled with Warnings:</h5>
                    <ul>
                        {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            <div className="modal-footer">
                <Button variant="primary" onClick={handleClose}>Done</Button>
            </div>
        </div>
    );

    return (
        <Modal open={open} onClose={handleClose} title="Bulk Import Experts" width="1100px">
            <div className="bulk-import-container">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </Modal>
    );
}

