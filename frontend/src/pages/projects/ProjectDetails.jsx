import { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchProjectById, fetchProjectExpertStatus, setProjectExpertStatus, setProjectCallAssignment } from '../../api/projects';
import { fetchClientById } from '../../api/clients';
import Modal from '../../components/ui/Modal';
import { updateExpert } from '../../api/experts';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Checkbox from '../../components/ui/Checkbox';

function DetailItem({ label, value, full }) {
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 8, gridColumn: full ? 'span 2' : undefined }}>
            <div style={{ minWidth: 180, fontWeight: 700, color: 'var(--text-strong)' }}>{label}</div>
            <div style={{ color: 'var(--text)' }}>{value ?? '—'}</div>
        </div>
    );
}

function ExpandableBio({ bio, title, isExpanded, onToggle }) {
    const bioRef = useRef(null);
    const [hasMore, setHasMore] = useState(false);

    useLayoutEffect(() => {
        if (bioRef.current && bio) {
            const lineHeight = 1.62 * 13.5; // 1.62 line-height * 13.5px font-size
            const maxHeight = lineHeight * 3;
            // Briefly remove clamp to measure full height
            const currentClamp = bioRef.current.style.webkitLineClamp;
            const currentDisplay = bioRef.current.style.display;
            
            bioRef.current.style.webkitLineClamp = 'initial';
            bioRef.current.style.display = 'block';
            
            const fullHeight = bioRef.current.scrollHeight;
            
            // Restore
            bioRef.current.style.webkitLineClamp = currentClamp;
            bioRef.current.style.display = currentDisplay;

            setHasMore(fullHeight > maxHeight + 5); // 5px buffer
        }
    }, [bio]);

    if (!bio && !title) return <div className="p-bio">—</div>;

    return (
        <div className="p-bio-wrap">
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111', marginBottom: 4 }}>{title || 'Expert'}</div>
            {bio ? (
                <div style={{ position: 'relative' }}>
                    <div 
                        ref={bioRef}
                        className={`p-bio ${isExpanded ? 'expanded' : ''}`}
                    >
                        {bio}
                    </div>
                    {hasMore && (
                        <span 
                            className={`p-bio-more ${isExpanded ? 'expanded' : ''}`} 
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle();
                            }}
                        >
                            {isExpanded ? ' less' : '... more'}
                        </span>
                    )}
                </div>
            ) : null}
        </div>
    );
}

function StarRating({ rating, onRate }) {
    const [hover, setHover] = useState(0);
    const stars = [1, 2, 3];

    return (
        <div 
            className="star-rating-container" 
            style={{ 
                display: 'flex', 
                gap: '0.25rem',
                alignItems: 'center'
            }}
        >
            {stars.map((star) => (
                <svg
                    key={star}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={(hover || rating) >= star ? "#FFD700" : "none"}
                    stroke={(hover || rating) >= star ? "#FFD700" : "#999"}
                    strokeWidth="2"
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => {
                        onRate(rating === star ? 0 : star);
                    }}
                    style={{ cursor: 'pointer', transition: 'transform 0.1s ease' }}
                    className="star-svg"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
}

export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [expandedExpertId, setExpandedExpertId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [serviceOpen, setServiceOpen] = useState(false);
    const [clientData, setClientData] = useState(null);

    const loadParticipants = async () => {
        try {
            const status = await fetchProjectExpertStatus(id);
            const map = new Map();
            // Scheduled and Completed take precedence
            for (const e of (status?.scheduled || [])) {
                map.set(e.id, { ...e, category: 'Scheduled' });
            }
            for (const e of (status?.completed || [])) {
                map.set(e.id, { ...e, category: 'Completed' });
            }
            // Then Accepted, Invited, Leads if not already present
            for (const e of (status?.accepted || [])) {
                if (!map.has(e.id)) map.set(e.id, { ...e, category: 'Accepted' });
            }
            for (const e of (status?.invited || [])) {
                if (!map.has(e.id)) map.set(e.id, { ...e, category: 'Invited' });
            }
            for (const e of (status?.leads || [])) {
                if (!map.has(e.id)) map.set(e.id, { ...e, category: 'Leads' });
            }
            setParticipants(Array.from(map.values()));
        } catch (err) {
            console.error('Failed to load participants', err);
            setParticipants([]);
        }
    };

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchProjectById(id).then((p) => {
            if (cancelled) return;
            setProject(p || null);
            setIsLoading(false);
            const cid = p?.client_id;
            if (cid) {
                fetchClientById(cid).then((c) => {
                    if (!cancelled) setClientData(c || null);
                }).catch(() => {});
            }
        });
        loadParticipants();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const handleStatusChange = async (expertId, newCategory, currentCategory) => {
        const catMap = { 'Leads': 'L', 'Invited': 'I', 'Accepted': 'A' };
        const catCode = catMap[newCategory];
        if (!catCode) {
        // Handle Scheduled/Completed assignment
            if (newCategory === 'Scheduled' || newCategory === 'Completed') {
                setIsUpdatingStatus(true);
                setUpdatingId(expertId);
                try {
                    // switching to S/C — if currently S/C and different, remove previous
                    if (currentCategory === 'Scheduled' || currentCategory === 'Completed') {
                        const prevCode = currentCategory === 'Scheduled' ? 'S' : 'C';
                        const nextCode = newCategory === 'Scheduled' ? 'S' : 'C';
                        if (prevCode !== nextCode) {
                            await setProjectCallAssignment(id, { expert_id: expertId, category: prevCode, action: 'REMOVE' });
                        }
                        await setProjectCallAssignment(id, { expert_id: expertId, category: nextCode, action: 'ADD' });
                    } else {
                        const code = newCategory === 'Scheduled' ? 'S' : 'C';
                        await setProjectCallAssignment(id, { expert_id: expertId, category: code, action: 'ADD' });
                    }
                    await loadParticipants();
                } catch (err) {
                    console.error('Failed to update status:', err);
                    alert('Failed to update status');
                } finally {
                    setUpdatingId(null);
                    setIsUpdatingStatus(false);
                }
            }
            return;
        }

        setIsUpdatingStatus(true);
        setUpdatingId(expertId);
        try {
            // leaving S/C -> remove assignment before setting L/I/A
            if (currentCategory === 'Scheduled' || currentCategory === 'Completed') {
                const prevCode = currentCategory === 'Scheduled' ? 'S' : 'C';
                await setProjectCallAssignment(id, { expert_id: expertId, category: prevCode, action: 'REMOVE' });
            }
            await setProjectExpertStatus(id, { expert_id: expertId, category: catCode });
            await loadParticipants();
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
            setIsUpdatingStatus(false);
        }
    };

    const filteredParticipants = useMemo(() => {
         let list = participants;
         if (statusFilter !== 'All') {
             list = participants.filter(p => p.category === statusFilter);
         }
         // Sort by rating descending (highest first)
         return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
     }, [participants, statusFilter]);

    const handleRateExpert = async (expertId, newRating) => {
        try {
            await updateExpert(expertId, { rating: newRating });
            // Update local state to reflect the change immediately
            setParticipants(prev => prev.map(p => 
                (p.id === expertId || p.expert_id === expertId) ? { ...p, rating: newRating } : p
            ));
        } catch (err) {
            console.error('Failed to update rating:', err);
            alert('Failed to update rating');
        }
    };

    const handleSelect = (expertId) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(expertId)) {
            newSelectedIds.delete(expertId);
        } else {
            newSelectedIds.add(expertId);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredParticipants.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredParticipants.map(p => p.id || p.expert_id)));
        }
    };

    const receivedDate = useMemo(
        () => (project?.received_date ? new Date(project.received_date).toLocaleDateString() : '—'),
        [project?.received_date]
    );
    const deadlineDate = useMemo(
        () => (project?.project_deadline ? new Date(project.project_deadline).toLocaleDateString() : '—'),
        [project?.project_deadline]
    );
    // Removed unused lastModified calculation

    if (isLoading || !project) return <Loader rows={8} />;

    return (
        <>
            <style>{`
  *, *::before, *::after { box-sizing: border-box; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #f0f0f0; color: #1a1a1a; font-size: 13.5px; line-height: 1.5; }
  a { color: #1a1a1a; text-decoration: none; }
  .page { margin: 12px auto; background: #ffffff; border: 1px solid #c8c8c8; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.10); }
  .hdr { background: #ffffff; border-bottom: 1px solid #d0d0d0; padding: 10px 14px 0 14px; position: relative; }
  .hdr-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
  .hdr-title { font-size: 1.25rem; font-weight: 700; color: #111111; letter-spacing: -0.01em; }
  .btn-edit { display: inline-flex; align-items: center; gap: 6px; background: #8b1a1a; color: #ffffff; font-family: inherit; font-size: 0.78rem; font-weight: 600; padding: 7px 16px; border: none; border-radius: 3px; cursor: pointer; letter-spacing: 0.01em; white-space: nowrap; flex-shrink: 0; }
  .btn-edit:hover { background: #7a1515; }
  .hdr-subtitle { font-size: 0.82rem; color: #444444; margin-bottom: 14px; }
  .hdr-subtitle a { color: #444444; font-weight: 500; }
  .team-row { display: flex; gap: 20px; padding: 6px 0; border-top: 1px solid #e0e0e0; }
  .team-member { display: flex; align-items: center; gap: 10px; }
  .t-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #ffffff; flex-shrink: 0; }
  .t-av-dark { background: #2c2c3e; } .t-av-wine { background: #7c1c3c; }
  .t-info { display: flex; flex-direction: column; gap: 1px; }
  .t-name { font-weight: 600; font-size: 0.88rem; color: #111111; } .t-role { font-size: 0.75rem; color: #666666; } .t-email { font-size: 0.73rem; color: #888888; }
  .body-split { display: grid; grid-template-columns: 1fr 260px; border-bottom: 1px solid #d0d0d0; }
  .left-pane { padding: 12px 14px; border-right: 1px solid #d0d0d0; }
  .sec-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 6px; }
  .desc-text { font-size: 0.84rem; color: #333333; line-height: 1.65; margin-bottom: 6px; }
  .bullet-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .bullet-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.84rem; color: #333333; line-height: 1.5; }
  .bullet-list li::before { content: '•'; color: #555555; flex-shrink: 0; font-size: 1rem; }
  .disclaimer { font-size: 0.81rem; color: #555555; line-height: 1.65; margin-bottom: 8px; }
  .divider { height: 1px; background: #e0e0e0; margin: 8px 0; }
  .q-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 6px; }
  .q-item { font-size: 0.84rem; color: #333333; line-height: 1.6; padding: 2px 0; }
  .right-pane { padding: 12px 12px; background: #fafafa; }
  .ideal-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 8px; }
  .ideal-sub { font-size: 0.82rem; font-weight: 600; color: #111111; margin-bottom: 4px; text-decoration: underline; text-underline-offset: 2px; }
  .ideal-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .ideal-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.83rem; color: #333333; }
  .ideal-list li::before { content: '•'; color: #555555; flex-shrink: 0; font-size: 1rem; }
  .participants-wrap { background: #ffffff; width: 100%; }
  .p-bar { display: grid; grid-template-columns: 3rem 6.5rem 1.5fr 2fr 0.8fr 1.5fr; background: #ebebeb; border-bottom: 1px solid #c8c8c8; align-items: center; position: sticky; top: 0; z-index: 10; }
  .p-bar-col { padding: 0.75rem 1rem; font-size: 0.8rem; font-weight: 600; color: #333333; display: flex; align-items: center; gap: 0.5rem; }
  .p-bar-col:not(:last-child) { border-right: 1px solid #c8c8c8; }
  .p-row { display: grid; grid-template-columns: 3rem 6.5rem 1.5fr 2fr 0.8fr 1.5fr; border-bottom: 1px solid #e4e4e4; align-items: stretch; }
  .p-row:last-child { border-bottom: none; }
  .p-cell { padding: 10px 12px; vertical-align: top; overflow: hidden; }
  .p-cell:not(:last-child) { border-right: 1px solid #e4e4e4; }
  .p-name-row { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
  .p-name { font-size: 0.88rem; font-weight: 600; color: #111111; }
  .li-badge { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; background: #0a66c2; border-radius: 3px; }
  .li-badge svg { width: 20px; height: 20px; fill: white; }
  .id-badge { display: inline-flex; align-items: center; justify-content: center; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; color: #333; background: #efefef; border: 1px solid #d0d0d0; border-radius: 3px; }
  .p-history { font-size: 0.80rem; color: #444444; line-height: 1.5; }
  .p-history-item { margin-bottom: 4px; }
  .p-history-role { font-weight: 600; color: #111; }
  .p-history-company { color: #555; }
  .p-history-years { font-size: 0.72rem; color: #888; }
  .p-bio-wrap { margin-top: 4px; position: relative; }
  .p-bio { font-size: 0.80rem; color: #444444; line-height: 1.62; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; white-space: pre-wrap; padding-right: 0; }
  .p-bio.expanded { -webkit-line-clamp: initial; display: block; padding-bottom: 20px; }
  .p-bio-more { font-size: 0.76rem; color: #1a5ca8; font-weight: 600; cursor: pointer; background: #ffffff; padding-left: 4px; }
  .p-bio-more:not(.expanded) { position: absolute; bottom: 0; right: 0; box-shadow: -10px 0 10px #ffffff; }
  .p-bio-more.expanded { position: absolute; bottom: 0; right: 0; }
  .p-bio-more:hover { text-decoration: underline; }
  .status-wrap { display: flex; align-items: flex-start; padding-top: 0; position: relative; }
  .s-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.76rem; font-weight: 500; padding: 4px 10px 4px 8px; border: 1px solid #c0c0c0; border-radius: 3px; background: #f7f7f7; color: #333333; white-space: nowrap; cursor: pointer; }
  .s-chip:hover { border-color: #888; }
  .s-chip .arrow { font-size: 0.65rem; color: #888; }
  .status-select { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  .p-filter-select { background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #555; cursor: pointer; padding: 2px 4px; outline: none; }
  .p-filter-select:hover { color: #111; }
  /* Leads — blue */
  .s-pending { background: #e8f0ff; border-color: #80a0e0; color: #1a3070; }
  /* Invited — yellow */
  .s-contacted { background: #fef9c3; border-color: #f59e0b; color: #854d0e; }
  /* Scheduled — light green */
  .s-scheduled { background: #dcfce7; border-color: #86efac; color: #166534; }
  /* Completed — green */
  .s-completed { background: #bbf7d0; border-color: #34d399; color: #065f46; }
  /* Accepted — leaf green */
  .s-accepted { background: #e6f4ea; border-color: #34a853; color: #1f6f3d; }
  .bi { display: flex; flex-direction: column; gap: 5px; }
  .bi { display: flex; flex-direction: column; gap: 3px; }
  .bi-row { font-size: 0.81rem; color: #333333; display: flex; align-items: center; gap: 0; }
  .bi-row.email { color: #1a5ca8; }
  .bi-fee { font-weight: 600; color: #111111; }
  @media (max-width: 700px) { .body-split { grid-template-columns: 1fr; } }
            `}</style>
            <div className="page">
                <div className="hdr">
                    <div className="hdr-top">
                        <div className="hdr-title">{project.project_title || project.title || 'Project'}</div>
                        <button className="btn-edit" onClick={() => navigate(`/projects/${project.project_id}/edit`)}>Edit Project</button>
                    </div>
                    <div className="hdr-subtitle">
                        Client: <strong>{project.client_id ? <a href={`/clients/${project.client_id}`}>{project.client_name || `#${project.client_id}`}</a> : (project.client_name || `#${project.client_id}`)}</strong> • PoC: <strong>{project.poc_user_id ? <a href={`/users/${project.poc_user_id}`}>{project.poc_user_name || '—'}</a> : (project.poc_user_name || '—')}</strong> • Status: <strong>{project.status || '—'}</strong> • <a href="#" onClick={(e) => { e.preventDefault(); setServiceOpen(true); }}>Service Rules</a>
                    </div>
                    <div className="team-row">
                        <div className="team-member">
                            <div className="t-avatar t-av-dark">{(project.client_solution_owner_names || [])[0]?.slice(0,2).toUpperCase() || 'RA'}</div>
                            <div className="t-info">
                                <div className="t-name">{(project.client_solution_owner_names || []).join(', ') || '—'}</div>
                                <div className="t-role">Research Analyst</div>
                            </div>
                        </div>
                        <div className="team-member">
                            <div className="t-avatar t-av-wine">{(project.sales_team_names || [])[0]?.slice(0,2).toUpperCase() || 'AM'}</div>
                            <div className="t-info">
                                <div className="t-name">{(project.sales_team_names || []).join(', ') || '—'}</div>
                                <div className="t-role">Account Manager</div>
                            </div>
                        </div>
                    </div>
                </div>
                {serviceOpen && (
                    <Modal
                        open={serviceOpen}
                        onClose={() => setServiceOpen(false)}
                        title="Service Rules"
                    >
                        <div className="desc-text" style={{ whiteSpace: 'pre-wrap' }}>
                            {clientData?.service_rules || '—'}
                        </div>
                    </Modal>
                )}
                <div className="body-split">
                    <div className="left-pane">
                        <div className="sec-title">Project Description</div>
                        <div className="desc-text">{project.project_description || '—'}</div>
                        <div className="disclaimer">Region: {project.target_region || '—'}</div>
                        <div className="divider"></div>
                        <div className="q-title">Project Questions</div>
                        {[project.profile_question_1, project.profile_question_2, project.profile_question_3, project.compliance_question_1].filter(Boolean).map((q, i) => (
                            <div className="q-item" key={i}>{q}</div>
                        ))}
                    </div>
                    <div className="right-pane">
                        <div className="ideal-title">Key Info</div>
                        <ul className="ideal-list">
                            <li>
                                Client: {project.client_id ? <a href={`/clients/${project.client_id}`}>{project.client_name || `#${project.client_id}`}</a> : (project.client_name || `#${project.client_id}`)}
                            </li>
                            <li>Received Date: {receivedDate}</li>
                            <li>Deadline: {deadlineDate}</li>
                        </ul>
                        <div className="ideal-title">Ideal Candidate Profile</div>
                        <div className="ideal-sub">Target Companies:</div>
                        <ul className="ideal-list">
                            {(project.target_companies || '').split('\n').join(',').split(',').filter(x => x.trim()).map((c, i) => <li key={i}>{c.trim()}</li>)}
                        </ul>
                        <div className="ideal-sub">Target Titles:</div>
                        <ul className="ideal-list">
                            {(project.target_functions_titles || '').split('\n').join(',').split(',').filter(x => x.trim()).map((t, i) => <li key={i}>{t.trim()}</li>)}
                        </ul>
                    </div>
                </div>
                <div className="participants-wrap">
                    <div className="p-bar">
                        <div className="p-bar-col">
                            <Checkbox 
                                id="select-all-participants"
                                checked={selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0}
                                onChange={handleSelectAll}
                                ariaLabel="Select all participants"
                            />
                        </div>
                        <div className="p-bar-col" title="Favorite">Fav</div>
                        <div className="p-bar-col">Participants ({filteredParticipants.length})</div>
                        <div className="p-bar-col">Employment History</div>
                        <div className="p-bar-col">
                            Status
                            <select 
                                className="p-filter-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All</option>
                                <option value="Leads">Leads</option>
                                <option value="Invited">Invited</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                        <div className="p-bar-col">Basic Info</div>
                    </div>
                    {filteredParticipants.map((row, idx) => {
                        const expertId = row.id || row.expert_id;
                        const name = row.name || 'Expert';
                        const email = row.email || '—';
                        const phone = row.phone || '—';
                        const linkedin = row.linkedin_url || null;
                        const statusLabel = row.category || '—';
                        const history = Array.isArray(row.employment_history) ? row.employment_history : [];
                        let statusClass = 's-pending';
                        if (statusLabel === 'Leads') statusClass = 's-pending';
                        else if (statusLabel === 'Invited') statusClass = 's-contacted';
                        else if (statusLabel === 'Accepted') statusClass = 's-accepted';
                        else if (statusLabel === 'Scheduled') statusClass = 's-scheduled';
                        return (
                            <div className="p-row" key={`${expertId}-${idx}`}>
                                <div className="p-cell">
                                    <Checkbox 
                                        id={`select-expert-${expertId}`}
                                        checked={selectedIds.has(expertId)}
                                        onChange={() => handleSelect(expertId)}
                                        ariaLabel={`Select ${name}`}
                                    />
                                </div>
                                <div className="p-cell">
                                    <StarRating 
                                        rating={row.rating || 0} 
                                        onRate={(newRating) => handleRateExpert(expertId, newRating)} 
                                    />
                                </div>
                                <div className="p-cell">
                                    <div className="p-name-row">
                                        <div className="p-name">{name}</div>
                                        {row.expert_code ? <span className="id-badge" title="Expert Number">{row.expert_code}</span> : null}
                                        {linkedin ? (
                                            <a className="li-badge" href={linkedin} target="_blank" rel="noreferrer" title="LinkedIn">
                                                <svg viewBox="0 0 72 72"><path d="M16.5,29.5h7.1V56H16.5V29.5z M20.1,16.5c2.3,0,3.9,1.6,3.9,3.6c0,2-1.6,3.6-3.9,3.6h0c-2.3,0-3.9-1.6-3.9-3.6 C16.2,18.1,17.8,16.5,20.1,16.5z M29.5,29.5h6.8v3.6h0.1c0.9-1.7,3.2-3.5,6.6-3.5c7,0,8.3,4.6,8.3,10.6V56h-7.1V42.6 c0-3.2-0.1-7.3-4.5-7.3c-4.5,0-5.2,3.5-5.2,7.1V56h-7.1V29.5z" fill="white"></path></svg>
                                            </a>
                                        ) : null}
                                    </div>
                                    <ExpandableBio 
                                        bio={row.bio} 
                                        title={row.title} 
                                        isExpanded={expandedExpertId === expertId}
                                        onToggle={() => setExpandedExpertId(expandedExpertId === expertId ? null : expertId)}
                                    />
                                </div>
                                <div className="p-cell">
                                    <div className="p-history">
                                        {history.length > 0 ? (
                                            history.map((exp, i) => (
                                                <div key={i} className="p-history-item">
                                                    <div className="p-history-role">{exp.role_title}</div>
                                                    <div className="p-history-company">{exp.company_name}</div>
                                                    <div className="p-history-years">
                                                        {exp.start_year || '??'} – {exp.end_year || 'Present'}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: '#999' }}>—</div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-cell">
                                    <div className="status-wrap">
                                        <div className={`s-chip ${statusClass}`}>
                                            <span className="arrow">▶</span>{statusLabel}
                                            <select 
                                                className="status-select"
                                                value={statusLabel}
                                                disabled={isUpdatingStatus || updatingId === expertId}
                                                onChange={(e) => handleStatusChange(expertId, e.target.value, statusLabel)}
                                            >
                                                <option value="Leads">Leads</option>
                                                <option value="Invited">Invited</option>
                                                <option value="Accepted">Accepted</option>
                                                <option value="Scheduled">Scheduled</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                            {updatingId === expertId && (
                                                <svg width="14" height="14" viewBox="0 0 50 50" style={{ marginLeft: 6 }}>
                                                    <circle cx="25" cy="25" r="20" stroke="#888" strokeWidth="5" fill="none" strokeDasharray="31.4 31.4">
                                                        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                                                    </circle>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-cell">
                                    <div className="bi">
                                        <div className="bi-row email">{email}</div>
                                        <div className="bi-row">{phone}</div>
                                        <div className="bi-row">Loc: {row.location || '—'} ({row.timezone || '—'})</div>
                                        <div className="bi-row">Research Analysts: {row.client_solution_owner_name || '—'}</div>
                                        <div className="bi-row">Fee: <span className="bi-fee">—</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
