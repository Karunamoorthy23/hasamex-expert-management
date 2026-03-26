import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';

export default function ClientUsersBasicTable({ clientId, sticky = true, maxHeight = 420 }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        if (!clientId) {
            setRows([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const params = new URLSearchParams();
        params.set('limit', '1000');
        params.set('client_id', String(clientId));
        http(`/users?${params.toString()}`)
            .then((res) => {
                if (cancelled) return;
                setRows(Array.isArray(res?.data) ? res.data : []);
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setRows([]);
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [clientId]);

    const items = useMemo(
        () =>
            rows.map((u) => ({
                id: u.user_id,
                code: u.user_code || u.user_id,
                name: u.user_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
                title: u.designation_title || '—',
                email: u.email || '—',
                location: u.location || '—',
                createdAt: u.created_at ? formatDate(u.created_at) : '—',
            })),
        [rows]
    );

    return (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
            <div style={{ overflowY: 'auto', maxHeight }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: sticky ? 'sticky' : 'static', top: 0, zIndex: 5, background: '#ebebeb' }}>
                        <tr>
                            <th style={thNoWrap}>User ID</th>
                            <th style={th}>User Name</th>
                            <th style={th}>Title</th>
                            <th style={th}>Email</th>
                            <th style={th}>Location</th>
                            <th style={th}>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={td}>
                                    Loading…
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={td}>
                                    No users
                                </td>
                            </tr>
                        ) : (
                            items.map((r) => (
                                <tr key={r.id} style={{ borderTop: '1px solid #e8e8e8' }}>
                                    <td style={tdNoWrap}>
                                        {r.id ? (
                                            <Link to={`/users/${r.id}`} style={link}>
                                                {r.code}
                                            </Link>
                                        ) : (
                                            r.code
                                        )}
                                    </td>
                                    <td style={td}>
                                        {r.id ? (
                                            <Link to={`/users/${r.id}`} style={link}>
                                                {r.name}
                                            </Link>
                                        ) : (
                                            r.name
                                        )}
                                    </td>
                                    <td style={td}>{r.title}</td>
                                    <td style={td}>
                                        {r.email && r.email !== '—' ? (
                                            <a href={`mailto:${r.email}`} style={link}>
                                                {r.email}
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td style={td}>{r.location}</td>
                                    <td style={td}>{r.createdAt}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function formatDate(value) {
    try {
        const d = new Date(value);
        return d.toLocaleDateString();
    } catch {
        return value;
    }
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

const thNoWrap = { ...th, whiteSpace: 'nowrap' };
const tdNoWrap = { ...td, whiteSpace: 'nowrap' };
