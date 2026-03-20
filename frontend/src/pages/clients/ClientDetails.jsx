import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchClientById } from '../../api/clients';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

function DetailItem({ label, value, full }) {
    return (
        <div className="form-field" style={full ? { gridColumn: 'span 2' } : undefined}>
            <label className="form-label" style={{ fontWeight: 700 }}>{label} :</label>
            <div className="form-value">{value ?? '—'}</div>
        </div>
    );
}

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [client, setClient] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchClientById(id).then((c) => {
            if (cancelled) return;
            setClient(c || null);
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const websiteDisplay = useMemo(() => {
        if (!client?.website) return null;
        const url = client.website.startsWith('http') ? client.website : `https://${client.website}`;
        return (
            <a href={url} target="_blank" rel="noreferrer">
                {client.website}
            </a>
        );
    }, [client?.website]);

    const linkedinDisplay = useMemo(() => {
        if (!client?.linkedin_url) return null;
        return (
            <a href={client.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn
            </a>
        );
    }, [client?.linkedin_url]);

    if (isLoading || !client) return <Loader rows={8} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">{client.client_name}</h1>
                <p className="page-subtitle">Client details overview</p>
            </div>

            <div className="card">
                <div className="form-section">
                    <h2 className="form-section__title">Client</h2>
                    <div className="form-grid">
                        <DetailItem label="Client Name" value={client.client_name} />
                        <DetailItem label="Client Type" value={client.client_type || client.type} />
                        <DetailItem label="Country" value={client.country || client.location} />
                        <DetailItem label="Office Locations" value={client.office_locations} />
                        <DetailItem label="Website" value={websiteDisplay} />
                        <DetailItem label="LinkedIn" value={linkedinDisplay} />
                        <DetailItem label="Primary Contact ID" value={client.primary_contact_user_id ?? '—'} />
                        <DetailItem label="Client Manager (Internal)" value={client.client_manager_internal} />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Solution & Team</h2>
                    <div className="form-grid">
                        <DetailItem
                            label="Research Analyst"
                            value={
                                Array.isArray(client.client_solution_owner_names) && client.client_solution_owner_names.length
                                    ? client.client_solution_owner_names.join(', ')
                                    : '—'
                            }
                        />
                        <DetailItem
                            label="Account Manager"
                            value={
                                Array.isArray(client.sales_team_names) && client.sales_team_names.length
                                    ? client.sales_team_names.join(', ')
                                    : '—'
                            }
                        />
                        <DetailItem
                            label="Linked Experts"
                            value={
                                Array.isArray(client.expert_codes) && client.expert_codes.length
                                    ? client.expert_codes.join(', ')
                                    : '—'
                            }
                            full
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Commercial</h2>
                    <div className="form-grid">
                        <DetailItem label="Billing Currency" value={client.billing_currency} />
                        <DetailItem label="Payment Terms" value={client.payment_terms} />
                        <DetailItem label="Invoicing Email" value={client.invoicing_email} />
                        <DetailItem label="Client Status" value={client.client_status || client.status} />
                        <DetailItem
                            label="Engagement Start Date"
                            value={client.engagement_start_date ? new Date(client.engagement_start_date).toLocaleDateString() : '—'}
                        />
                        <DetailItem
                            label="Signed MSA?"
                            value={client.signed_msa === true ? 'Yes' : client.signed_msa === false ? 'No' : '—'}
                        />
                        <DetailItem label="Commercial Model" value={client.commercial_model} full />
                        <DetailItem label="Agreed Pricing" value={client.agreed_pricing} full />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Notes</h2>
                    <div className="form-grid">
                        <DetailItem label="Business Activity Summary" value={client.business_activity_summary} full />
                        <DetailItem label="Notes" value={client.notes} full />
                        <DetailItem label="Users" value={client.users} full />
                        <DetailItem label="MSA" value={client.msa} full />
                    </div>
                </div>

                <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={() => navigate('/clients')}>
                        Back to Clients
                    </Button>
                    <Button type="button" variant="primary" onClick={() => navigate(`/clients/${client.client_id}/edit`)}>
                        Edit Client
                    </Button>
                </div>
            </div>
        </>
    );
}
