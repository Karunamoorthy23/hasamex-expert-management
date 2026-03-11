import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { MailIcon, CopyIcon, DownloadIcon, CheckIcon } from '../icons/Icons';
import { fetchEmailExport } from '../../api/experts';
import '../../styles/bulk-email.css';

/**
 * Modal to display and export contact details for selected experts.
 */
export default function BulkEmailModal({ open, onClose, ids = [] }) {
    const [loading, setLoading] = useState(false);
    const [experts, setExperts] = useState([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open && ids.length > 0) {
            loadExperts();
        } else if (!open) {
            // Reset when closing
            setExperts([]);
            setCopied(false);
        }
    }, [open, ids]);

    const loadExperts = async () => {
        setLoading(true);
        try {
            const response = await fetchEmailExport(ids);
            setExperts(response.data || []);
        } catch (error) {
            console.error('Failed to load experts for email view', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAll = () => {
        if (experts.length === 0) return;
        const emails = experts
            .map(e => e.email)
            .filter(email => email && email !== 'No Email Provided')
            .join(', ');

        if (!emails) {
            alert('No valid emails to copy.');
            return;
        }

        navigator.clipboard.writeText(emails);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (experts.length === 0) return;

        // CSV Content
        const headers = ['Name', 'Email', 'Title', 'Company'];
        const rows = experts.map(e => [
            `"${e.name.replace(/"/g, '""')}"`,
            `"${e.email.replace(/"/g, '""')}"`,
            `"${e.title.replace(/"/g, '""')}"`,
            `"${e.company.replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `experts_contact_list_${timestamp}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Expert Contacts (${ids.length})`}
            width="900px"
        >
            <div className="bulk-email-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <span>Fetching contact details...</span>
                    </div>
                ) : experts.length === 0 ? (
                    <div className="loading-state">
                        <span>No experts selected or data unavailable.</span>
                    </div>
                ) : (
                    <>
                        <div className="bulk-email-header">
                            <p className="description">
                                Professional contact list for your selected experts. You can copy all email addresses for bulk messaging or download the full list as a CSV.
                            </p>
                            <div className="actions">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCopyAll}
                                    startIcon={copied ? <CheckIcon /> : <CopyIcon />}
                                >
                                    {copied ? 'Copied!' : 'Copy Emails'}
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleDownload}
                                    startIcon={<DownloadIcon />}
                                >
                                    Download CSV
                                </Button>
                            </div>
                        </div>

                        <div className="email-table-wrapper">
                            <table className="email-table">
                                <thead>
                                    <tr>
                                        <th>Expert Name</th>
                                        <th>Primary Email</th>
                                        <th>Role & Organization</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {experts.map(expert => (
                                        <tr key={expert.id}>
                                            <td className="expert-name">{expert.name}</td>
                                            <td className="expert-email">
                                                <a href={`mailto:${expert.email}`} title="Send email">
                                                    {expert.email}
                                                </a>
                                            </td>
                                            <td className="expert-info">
                                                <div className="title">{expert.title}</div>
                                                <div className="company">{expert.company}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
