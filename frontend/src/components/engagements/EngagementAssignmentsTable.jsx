import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';

export default function EngagementAssignmentsTable({ clientId, projectId, sticky = true, maxHeight = 420 }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        params.set('limit', '1000');
        if (clientId) params.set('client_id', String(clientId));
        if (projectId) params.set('project_id', String(projectId));
        http(`/engagements?${params.toString()}`).then((res) => {
            if (cancelled) return;
            setRows(Array.isArray(res?.data) ? res.data : []);
            setLoading(false);
        }).catch(() => {
            if (!cancelled) {
                setRows([]);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [clientId, projectId]);

    const items = useMemo(() => rows.map((e) => ({
        id: e.id,
        code: e.engagement_id || '—',
        date: e.call_date ? new Date(e.call_date).toLocaleString() : '—',
        project: { id: e.project_id, name: e.project_name || `#${e.project_id}` },
        user: { id: e.poc_user_id, name: e.poc_user_name || '—' },
        expert: { id: e.expert_id, name: e.expert_name || '—' },
        duration: e.actual_call_duration_mins ?? '—',
        clientRate: e.client_rate ?? '—',
        expertRate: e.expert_rate ?? '—',
    })), [rows]);

    return (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
            <div style={{ overflowY: 'auto', maxHeight }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: sticky ? 'sticky' : 'static', top: 0, zIndex: 5, background: '#ebebeb' }}>
                        <tr>
                            <th style={th}>Engagement ID</th>
                            <th style={th}>Date</th>
                            <th style={th}>Project</th>
                            <th style={th}>User</th>
                            <th style={th}>Expert</th>
                            <th style={th}>Duration (mins)</th>
                            <th style={th}>Client Rate</th>
                            <th style={th}>Expert Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={td}>Loading…</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={8} style={td}>No engagements</td></tr>
                        ) : (
                            items.map((r) => (
                                <tr key={r.id} style={{ borderTop: '1px solid #e8e8e8' }}>
                                    <td style={td}>
                                        {r.id ? <Link to={`/engagements/${r.id}`} style={link}>{r.code}</Link> : r.code}
                                    </td>
                                    <td style={td}>{r.date}</td>
                                    <td style={td}>
                                        {r.project.id ? <Link to={`/projects/${r.project.id}`} style={link}>{r.project.name}</Link> : r.project.name}
                                    </td>
                                    <td style={td}>
                                        {r.user.id ? <Link to={`/users/${r.user.id}`} style={link}>{r.user.name}</Link> : r.user.name}
                                    </td>
                                    <td style={td}>
                                        {r.expert.id ? <Link to={`/experts/${r.expert.id}`} style={link}>{r.expert.name}</Link> : r.expert.name}
                                    </td>
                                    <td style={td}>{r.duration}</td>
                                    <td style={td}>{r.clientRate}</td>
                                    <td style={td}>{r.expertRate}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const th = {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '0.84rem',
    fontWeight: 600,
    color: '#333',
    borderRight: '1px solid #c8c8c8',
};

const td = {
    padding: '10px 12px',
    fontSize: '0.84rem',
    color: '#333',
    borderRight: '1px solid #e8e8e8',
};

const link = {
    color: '#1a1a1a',
    textDecoration: 'none',
    fontWeight: 600,
};
