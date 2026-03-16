import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getFilterOptions } from '../../api/experts';
import { http } from '../../api/http';
import { UploadIcon, XIcon, FileIcon } from '../../components/icons/Icons';
import TimezoneSelect from '../../components/ui/TimezoneSelect';


/**
 * Form field sections configuration.
 * Each section groups related fields for a clean layout.
 */
const FORM_SECTIONS = [
    {
        title: 'Personal Information',
        fields: [
            { name: 'expert_id', label: 'Expert ID', type: 'text', required: true, gridSpan: 1 },
            { name: 'salutation', label: 'Salutation', type: 'select', lookupCategory: 'salutation', gridSpan: 1 },
            { name: 'first_name', label: 'First Name', type: 'text', required: true, gridSpan: 1 },
            { name: 'last_name', label: 'Last Name', type: 'text', required: true, gridSpan: 1 },
            { name: 'primary_email', label: 'Primary Email', type: 'email', required: true, gridSpan: 1 },
            { name: 'secondary_email', label: 'Secondary Email', type: 'email', gridSpan: 1 },
            { name: 'primary_phone', label: 'Primary Phone', type: 'tel', required: true, gridSpan: 1 },
            { name: 'secondary_phone', label: 'Secondary Phone', type: 'tel', gridSpan: 1 },
            { name: 'linkedin_url', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/...', required: true, gridSpan: 1 },
        ],
    },
    {
        title: 'Location & Region',
        fields: [
            { name: 'location', label: 'Location', type: 'text', placeholder: 'City, State, Country', gridSpan: 1 },
            { name: 'region', label: 'Region', type: 'select', lookupCategory: 'region', gridSpan: 1 },
            { name: 'timezone', label: 'Timezone', type: 'timezone', gridSpan: 2 },
        ],
    },
    {
        title: 'Professional Details',
        fields: [
            { name: 'title_headline', label: 'Title / Headline', type: 'text', placeholder: 'e.g., VP of Product, Enterprise Software', required: true, gridSpan: 2 },
            { name: 'current_employment_status', label: 'Employment Status', type: 'select', lookupCategory: 'current_employment_status', gridSpan: 1 },
            { name: 'seniority', label: 'Seniority', type: 'select', lookupCategory: 'seniority', gridSpan: 1 },
            { name: 'years_of_experience', label: 'Years of Experience', type: 'number', gridSpan: 1 },
            { name: 'primary_sector', label: 'Primary Sector', type: 'select', lookupCategory: 'primary_sector', gridSpan: 1 },
            { name: 'company_role', label: 'Company Role', type: 'select', lookupCategory: 'company_role', gridSpan: 1 },
            { name: 'expert_function', label: 'Expert Function', type: 'select', lookupCategory: 'expert_function', gridSpan: 1 },
        ],
    },
    {
        title: 'Bio & Experience',
        fields: [
            { name: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Brief professional biography...', gridSpan: 2 },
            { name: 'employment_history', label: 'Employment History', type: 'employment_history_builder', gridSpan: 2 },
            { name: 'strength_topics', label: 'Strength Topics', type: 'textarea', placeholder: 'Areas of expertise, separated by commas', gridSpan: 2 },
        ],
    },
    {
        title: 'Engagement & Compensation',
        fields: [
            { name: 'currency', label: 'Currency', type: 'select', lookupCategory: 'currency', gridSpan: 1 },
            { name: 'hourly_rate', label: 'Hourly Rate', type: 'number', step: '0.01', gridSpan: 1 },
            { name: 'expert_status', label: 'Expert Status', type: 'select', lookupCategory: 'expert_status', gridSpan: 1 },
            { name: 'hcms_classification', label: 'HCMS Classification', type: 'select', lookupCategory: 'hcms_classification', gridSpan: 1 },
            { name: 'total_calls_completed', label: 'Total Calls Completed', type: 'number', gridSpan: 1 },
            { name: 'project_id_added_to', label: 'Project ID Added To', type: 'text', gridSpan: 1 },
        ],
    },
    {
        title: 'Additional',
        fields: [
            { name: 'profile_pdf_url', label: 'Profile PDF URL', type: 'url', placeholder: 'https://...', gridSpan: 1 },
            { name: 'profile_file', label: 'Upload Profile PDF / CV', type: 'file', gridSpan: 1 },
            { name: 'payment_details', label: 'Payment Details', type: 'textarea', placeholder: 'Bank details, payment terms...', gridSpan: 2 },
            { name: 'events_invited_to', label: 'Events Invited To', type: 'textarea', placeholder: 'Past events, webinars...', gridSpan: 2 },
            { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Internal notes about this expert...', gridSpan: 2 },
        ],
    },
];

/**
 * Initial empty form state.
 */
function getInitialFormData() {
    return {
        expert_id: '',
        salutation: '',
        first_name: '',
        last_name: '',
        primary_email: '',
        secondary_email: '',
        primary_phone: '',
        secondary_phone: '',
        linkedin_url: '',
        location: '',
        region: '',
        timezone: '',
        current_employment_status: '',
        seniority: '',
        years_of_experience: '',
        title_headline: '',
        bio: '',
        employment_history: '',
        employmentHistoryArray: [],
        primary_sector: '',
        company_role: '',
        expert_function: '',
        strength_topics: '',
        currency: '',
        hourly_rate: '',
        hcms_classification: '',
        expert_status: '',
        notes: '',
        payment_details: '',
        events_invited_to: '',
        profile_pdf_url: '',
        total_calls_completed: '',
        project_id_added_to: '',
    };
}

/**
 * ExpertCreatePage — full-page form for adding a new expert.
 */
export default function ExpertCreatePage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(getInitialFormData());
    const [lookups, setLookups] = useState({});
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    // ── File State ──
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // ── Fetch lookup values from API ──
    useEffect(() => {
        getFilterOptions().then((data) => {
            setLookups(data);
        });
    }, []);

    // ── Dynamic Employment History Handlers ──
    const addEmploymentHistory = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            employmentHistoryArray: [
                ...(prev.employmentHistoryArray || []),
                { id: Date.now() + Math.random(), company: '', role: '', start_year: '', end_year: '' }
            ]
        }));
    }, []);

    const removeEmploymentHistory = useCallback((id) => {
        setFormData(prev => ({
            ...prev,
            employmentHistoryArray: prev.employmentHistoryArray.filter(item => item.id !== id)
        }));
    }, []);

    const handleEmploymentHistoryChange = useCallback((id, field, value) => {
        setFormData(prev => ({
            ...prev,
            employmentHistoryArray: prev.employmentHistoryArray.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    }, []);

    // ── Handle field change ──
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;

        let finalValue = value;
        if (name === 'primary_phone' || name === 'secondary_phone') {
            // Remove any characters that are not digits, spaces, or common phone symbols (+, -, (, ))
            finalValue = value.replace(/[^\d\s+\-()]/g, '');
        }

        setFormData((prev) => ({ ...prev, [name]: finalValue }));
        // Clear field error on change
        setErrors((prev) => {
            if (prev[name]) {
                const next = { ...prev };
                delete next[name];
                return next;
            }
            return prev;
        });
        setDuplicateWarning(null);
    }, []);

    useEffect(() => {
        if (submitError || duplicateWarning) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [submitError, duplicateWarning]);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setFormData(prev => ({ ...prev, profile_pdf_url: '' })); // Clear URL if file selected
        }
    }, []);

    const handleRemoveFile = useCallback(() => {
        setSelectedFile(null);
    }, []);

    // ── Client-side validation ──
    const validate = useCallback(() => {
        const newErrors = {};
        if (!formData.expert_id?.trim()) newErrors.expert_id = 'Expert ID is required';
        if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.primary_email?.trim()) newErrors.primary_email = 'Primary email is required';
        if (!formData.primary_phone?.trim()) newErrors.primary_phone = 'Primary phone is required';
        if (!formData.linkedin_url?.trim()) newErrors.linkedin_url = 'LinkedIn URL is required';
        if (!formData.title_headline?.trim()) newErrors.title_headline = 'Title / Headline is required';

        if (formData.primary_email && !/\S+@\S+\.\S+/.test(formData.primary_email)) {
            newErrors.primary_email = 'Invalid email format';
        }
        if (formData.secondary_email && !/\S+@\S+\.\S+/.test(formData.secondary_email)) {
            newErrors.secondary_email = 'Invalid email format';
        }
        if (formData.linkedin_url && !formData.linkedin_url.startsWith('http')) {
            newErrors.linkedin_url = 'URL must start with http:// or https://';
        }
        if (formData.years_of_experience && (isNaN(formData.years_of_experience) || formData.years_of_experience < 0)) {
            newErrors.years_of_experience = 'Must be a positive number';
        }
        if (formData.hourly_rate && (isNaN(formData.hourly_rate) || formData.hourly_rate < 0)) {
            newErrors.hourly_rate = 'Must be a positive number';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Scroll to the first error after state update
            setTimeout(() => {
                const firstErrorField = document.querySelector('.form-input--error');
                if (firstErrorField) {
                    firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstErrorField.focus();
                }
            }, 100);
            return false;
        }

        return true;
    }, [formData]);

    // ── Submit form ──
    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            setSubmitError('');
            setDuplicateWarning(null);

            if (!validate()) return;

            setIsSubmitting(true);

            let finalProfileUrl = formData.profile_pdf_url;

            // 1. Handle file upload if exists
            if (selectedFile) {
                try {
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', selectedFile);

                    const uploadRes = await fetch(`${import.meta.env.VITE_API_URL}/experts/upload-pdf`, {
                        method: 'POST',
                        body: uploadFormData
                    });

                    if (!uploadRes.ok) throw new Error('File upload failed');

                    const uploadData = await uploadRes.json();
                    finalProfileUrl = uploadData.url;
                } catch (err) {
                    setSubmitError('Failed to upload file. Please try again.');
                    setIsSubmitting(false);
                    return;
                }
            }

            // 2. Clean up data: convert empty strings to null, numbers to int/float
            const payload = { ...formData, profile_pdf_url: finalProfileUrl };
            if (payload.years_of_experience !== undefined && payload.years_of_experience !== '') {
                payload.years_of_experience = parseInt(payload.years_of_experience, 10);
            }
            if (payload.hourly_rate) payload.hourly_rate = parseFloat(payload.hourly_rate);
            if (payload.total_calls_completed !== undefined && payload.total_calls_completed !== '') {
                payload.total_calls_completed = parseInt(payload.total_calls_completed, 10);
            }

            // 3. Build employment_history string from array
            if (payload.employmentHistoryArray && payload.employmentHistoryArray.length > 0) {
                payload.employment_history = payload.employmentHistoryArray
                    .filter(exp => exp.company.trim() || exp.role.trim())
                    .map(exp => `${exp.role.trim() || 'Role'}, ${exp.company.trim() || 'Company'} (${exp.start_year || '??'}-${exp.end_year || 'Present'})`)
                    .join('\n');
            } else {
                payload.employment_history = '';
            }
            delete payload.employmentHistoryArray;

            try {
                const result = await http('/experts', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });

                // Success — navigate back to experts list
                navigate('/', { state: { message: `Expert ${result.data?.expert_id} created successfully` } });
            } catch (err) {
                if (err.status === 409 && err.data?.duplicate) {
                    setDuplicateWarning(err.data.details);
                } else {
                    setSubmitError(err.data?.error || 'Network error — is the backend running?');
                }
            } finally {
                setIsSubmitting(false);
            }
        },
        [formData, validate, navigate, selectedFile]
    );

    // ── Render a single form field ──
    const renderField = (field) => {
        const hasError = errors[field.name];
        const baseClass = `form-field${hasError ? ' form-field--error' : ''}`;

        const commonProps = {
            id: field.name,
            name: field.name,
            value: formData[field.name],
            onChange: handleChange,
            placeholder: field.placeholder || '',
            required: field.required || false,
            className: `form-input${hasError ? ' form-input--error' : ''}`,
        };

        if (field.type === 'employment_history_builder') {
            return (
                <div key={field.name} className="employment-history-section" style={{ gridColumn: 'span 2' }}>
                    <div className="eh-section-header">
                        <label className="form-label">{field.label}</label>
                        <button type="button" onClick={addEmploymentHistory} className="btn-add-eh">
                            + Add Employment History
                        </button>
                    </div>
                    <div className="eh-list">
                        {(!formData.employmentHistoryArray || formData.employmentHistoryArray.length === 0) ? (
                            <p className="empty-state__text" style={{ padding: '20px 0', border: '1px dashed var(--color-grey-300)', borderRadius: '8px', textAlign: 'center' }}>No employment history added. Click the button above to add one.</p>
                        ) : (
                            formData.employmentHistoryArray.map((entry, index) => (
                                <div key={entry.id} className="eh-card">
                                    <div className="eh-card-header">
                                        <h4 className="eh-card-title">Experience {index + 1}</h4>
                                        <button type="button" onClick={() => removeEmploymentHistory(entry.id)} className="btn btn--danger btn--sm" style={{ padding: '4px 10px', fontSize: '12px' }}>Remove</button>
                                    </div>
                                    <div className="eh-card-body">
                                        <div className="form-field">
                                            <label className="form-label">Company Name *</label>
                                            <input type="text" className="form-input" placeholder="e.g. Google" value={entry.company} onChange={e => handleEmploymentHistoryChange(entry.id, 'company', e.target.value)} required />
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Role / Position *</label>
                                            <input type="text" className="form-input" placeholder="e.g. Senior Engineer" value={entry.role} onChange={e => handleEmploymentHistoryChange(entry.id, 'role', e.target.value)} required />
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Start Year</label>
                                            <input type="number" min="1950" max={new Date().getFullYear() + 10} className="form-input" placeholder="YYYY" value={entry.start_year} onChange={e => handleEmploymentHistoryChange(entry.id, 'start_year', e.target.value)} />
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">End Year</label>
                                            <input type="number" min="1950" max={new Date().getFullYear() + 10} className="form-input" placeholder="YYYY (or leave blank for Present)" value={entry.end_year} onChange={e => handleEmploymentHistoryChange(entry.id, 'end_year', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        let input;

        switch (field.type) {
            case 'textarea':
                input = <textarea {...commonProps} rows={3} />;
                break;
            case 'select': {
                const options = lookups[field.lookupCategory] || [];
                input = (
                    <select {...commonProps} className={`form-select${hasError ? ' form-input--error' : ''}`}>
                        <option value="">— Select —</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
                break;
            }
            case 'number':
                input = <input {...commonProps} type="number" step={field.step || '1'} min="0" />;
                break;
            case 'timezone':
                input = (
                    <TimezoneSelect
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        hasError={hasError}
                    />
                );
                break;
            case 'file':
                input = (
                    <div className="file-upload-wrapper">
                        {selectedFile ? (
                            <div className="file-preview">
                                <FileIcon className="file-icon" />
                                <span className="file-name">{selectedFile.name}</span>
                                <button type="button" onClick={handleRemoveFile} className="remove-file-btn">
                                    <XIcon width={14} height={14} />
                                </button>
                            </div>
                        ) : (
                            <label className="file-upload-label">
                                <UploadIcon className="upload-icon" />
                                <span>Choose PDF or Word doc</span>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        )}
                    </div>
                );
                break;
            default:
                input = <input {...commonProps} type={field.type || 'text'} />;
        }

        return (
            <div
                key={field.name}
                className={baseClass}
                style={{ gridColumn: field.gridSpan === 2 ? 'span 2' : 'span 1' }}
            >
                <label htmlFor={field.name} className="form-label">
                    {field.label}
                    {field.required && <span className="form-required">*</span>}
                </label>
                {input}
                {hasError && <span className="form-error">{errors[field.name]}</span>}
            </div>
        );
    };

    return (
        <>
            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="page-title">Add New Expert</h1>
                    <p className="page-subtitle">Fill in the details to create a new expert profile</p>
                </div>
                <Link to="/" className="btn btn--secondary btn--sm">
                    ← Back to List
                </Link>
            </div>

            {/* Form Card */}
            <div className="card" style={{ padding: 0 }}>
                <form onSubmit={handleSubmit} className="expert-form" noValidate>

                    {/* Error banner */}
                    {submitError && (
                        <div className="form-banner form-banner--error">
                            <strong>Error:</strong> {submitError}
                        </div>
                    )}

                    {/* Duplicate warning */}
                    {duplicateWarning && (
                        <div className="form-banner form-banner--warning">
                            <strong>Duplicate found:</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                                {duplicateWarning.map((d, i) => (
                                    <li key={i}>{d.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Form sections */}
                    {FORM_SECTIONS.map((section) => (
                        <div key={section.title} className="form-section">
                            <h3 className="form-section__title">{section.title}</h3>
                            <div className="form-grid">
                                {section.fields.map(renderField)}
                            </div>
                        </div>
                    ))}

                    {/* Actions */}
                    <div className="form-actions">
                        <Link to="/" className="btn btn--ghost">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className="btn btn--primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Expert'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
