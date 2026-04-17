from flask import Blueprint, jsonify, request
from datetime import datetime
from extensions import db
from models import ChatSession, ChatMessage
from sqlalchemy import text
from agents import BasicQueryAgent

chat_bp = Blueprint('chat', __name__, url_prefix='/api/v1/chat')


def _current_user_id():
    claims = getattr(request, 'jwt_claims', {}) or {}
    return claims.get('user_id')


@chat_bp.route('/sessions', methods=['GET'])
def list_sessions():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    archived_param = request.args.get('archived')
    q = ChatSession.query.filter_by(owner_id=user_id)
    if archived_param is not None:
        archived = archived_param.lower() in ('1', 'true', 'yes')
        q = q.filter(ChatSession.archived == archived)
    rows = q.order_by(ChatSession.last_message_at.desc().nullslast(), ChatSession.created_at.desc()).all()
    data = [r.to_dict() for r in rows]
    return jsonify({'data': data}), 200


@chat_bp.route('/agent/ping', methods=['GET'])
def agent_ping():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    q = (request.args.get('query') or 'Hello').strip()
    agent = BasicQueryAgent()
    reply = agent.answer(q) or ""
    return jsonify({'data': {'query': q, 'reply': reply}}), 200


@chat_bp.route('/sessions', methods=['POST'])
def create_session():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    payload = request.get_json(silent=True) or {}
    title = str(payload.get('title') or 'New conversation').strip() or 'New conversation'
    now = datetime.utcnow()
    session = ChatSession(owner_id=user_id, title=title, last_message_at=None, created_at=now, updated_at=now)
    db.session.add(session)
    db.session.commit()
    return jsonify({'data': session.to_dict()}), 201


@chat_bp.route('/sessions/<string:sid>', methods=['PATCH'])
def update_session(sid):
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    payload = request.get_json(silent=True) or {}
    session = ChatSession.query.filter_by(id=sid, owner_id=user_id).first()
    if not session:
        return jsonify({'error': 'Not Found'}), 404
    if 'title' in payload:
        t = str(payload.get('title') or '').strip()
        if t:
            session.title = t
    if 'archived' in payload:
        session.archived = bool(payload.get('archived'))
    session.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'data': session.to_dict()}), 200


@chat_bp.route('/sessions/<string:sid>', methods=['DELETE'])
def delete_session(sid):
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    session = ChatSession.query.filter_by(id=sid, owner_id=user_id).first()
    if not session:
        return jsonify({'error': 'Not Found'}), 404
    # Explicitly delete messages first to handle missing DB-level cascade
    ChatMessage.query.filter_by(session_id=sid).delete()
    db.session.delete(session)
    db.session.commit()
    return jsonify({'data': True}), 200


@chat_bp.route('/sessions/<string:sid>/messages', methods=['GET'])
def list_messages(sid):
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    session = ChatSession.query.filter_by(id=sid, owner_id=user_id).first()
    if not session:
        return jsonify({'error': 'Not Found'}), 404
    rows = ChatMessage.query.filter_by(session_id=sid, owner_id=user_id).order_by(ChatMessage.created_at.asc()).all()
    data = [r.to_dict() for r in rows]
    return jsonify({'data': data}), 200


@chat_bp.route('/sessions/<string:sid>/messages', methods=['POST'])
def create_message(sid):
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    session = ChatSession.query.filter_by(id=sid, owner_id=user_id).first()
    if not session:
        return jsonify({'error': 'Not Found'}), 404
    payload = request.get_json(silent=True) or {}
    role = str(payload.get('role') or '').strip() or 'user'
    if role not in ('user', 'assistant', 'system', 'tool'):
        return jsonify({'error': 'Invalid role'}), 400
    content_text = str(payload.get('content_text') or '').strip()
    content_json = payload.get('content_json')
    if not content_text:
        return jsonify({'error': 'content_text required'}), 400
    msg = ChatMessage(session_id=session.id, owner_id=user_id, role=role, content_text=content_text, content_json=content_json, created_at=datetime.utcnow())
    db.session.add(msg)
    session.message_count = (session.message_count or 0) + 1
    session.last_message_at = msg.created_at
    session.updated_at = msg.created_at
    if role == 'user' and (session.title or '').strip().lower() == 'new conversation':
        t = content_text
        if len(t) > 36:
            t = t[:36] + '…'
        session.title = t
    db.session.commit()
    return jsonify({'data': msg.to_dict()}), 201


@chat_bp.route('/search', methods=['GET'])
def search_messages():
    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    query = (request.args.get('query') or '').strip()
    if not query:
        return jsonify({'data': []}), 200
    limit = request.args.get('limit', type=int) or 50
    session_id = (request.args.get('session_id') or '').strip() or None
    sql = """
        SELECT m.id, m.session_id, m.owner_id, m.role, m.content_text, m.created_at
        FROM ai_chat_messages m
        WHERE m.owner_id = :uid
          AND to_tsvector('english', m.content_text) @@ plainto_tsquery('english', :q)
          {session_filter}
        ORDER BY m.created_at DESC
        LIMIT :lim
    """
    session_filter = ""
    params = {'uid': user_id, 'q': query, 'lim': limit}
    if session_id:
        session_filter = "AND m.session_id = :sid"
        params['sid'] = session_id
    sql = sql.format(session_filter=session_filter)
    rows = db.session.execute(text(sql), params).mappings().all()
    data = []
    for r in rows:
        data.append({
            'id': str(r['id']),
            'session_id': str(r['session_id']),
            'owner_id': r['owner_id'],
            'role': r['role'],
            'content_text': r['content_text'],
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
        })
    return jsonify({'data': data}), 200


# ── Project-agent state helpers ───────────────────────────────────────────────

def _get_project_state(session_id: str, user_id: int) -> dict:
    """Load project agent state from the sentinel system message's content_json."""
    sentinel = (
        ChatMessage.query
        .filter_by(session_id=session_id, owner_id=user_id, role='system')
        .order_by(ChatMessage.created_at.asc())
        .first()
    )
    if sentinel and isinstance(sentinel.content_json, dict):
        return sentinel.content_json
    return {}


def _save_project_state(session_id: str, user_id: int, state: dict):
    """Persist project agent state into the sentinel system message."""
    sentinel = (
        ChatMessage.query
        .filter_by(session_id=session_id, owner_id=user_id, role='system')
        .order_by(ChatMessage.created_at.asc())
        .first()
    )
    if sentinel:
        sentinel.content_json = state
        sentinel.content_text = '__project_state__'
    else:
        sentinel = ChatMessage(
            session_id=session_id,
            owner_id=user_id,
            role='system',
            content_text='__project_state__',
            content_json=state,
            created_at=datetime.utcnow(),
        )
        db.session.add(sentinel)


# ── Main agent reply endpoint ─────────────────────────────────────────────────

@chat_bp.route('/sessions/<string:sid>/agent', methods=['POST'])
def agent_reply(sid):
    from agents import ProjectAgent

    user_id = _current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    session = ChatSession.query.filter_by(id=sid, owner_id=user_id).first()
    if not session:
        return jsonify({'error': 'Not Found'}), 404
    payload = request.get_json(silent=True) or {}
    content_text = str(payload.get('content_text') or '').strip()
    if not content_text:
        return jsonify({'error': 'content_text required'}), 400

    now = datetime.utcnow()

    # Save the user message
    user_msg = ChatMessage(
        session_id=session.id,
        owner_id=user_id,
        role='user',
        content_text=content_text,
        content_json=None,
        created_at=now,
    )
    db.session.add(user_msg)
    session.message_count = (session.message_count or 0) + 1
    session.last_message_at = now
    session.updated_at = now
    if (session.title or '').strip().lower() == 'new conversation':
        t = content_text
        if len(t) > 36:
            t = t[:36] + '…'
        session.title = t

    # ── Route: Project Agent vs Basic Agent ───────────────────────────────
    project_state = _get_project_state(sid, user_id)
    project_mode = project_state.get('project_mode')

    is_active_project = project_mode not in (None, 'done')
    is_project_intent = ProjectAgent.is_project_intent(content_text)

    if is_active_project or is_project_intent:
        p_agent = ProjectAgent()
        reply_text, new_state = p_agent.handle(project_state, content_text, db)
        _save_project_state(sid, user_id, new_state)
        if not reply_text:
            reply_text = "Something went wrong. Please try again."
    else:
        # BasicQueryAgent with conversation context (user + assistant messages only)
        msgs = (
            ChatMessage.query
            .filter_by(session_id=sid, owner_id=user_id)
            .filter(ChatMessage.role.in_(['user', 'assistant']))
            .order_by(ChatMessage.created_at.asc())
            .limit(20)
            .all()
        )
        lines = [f"{m.role}: {m.content_text or ''}" for m in msgs]
        ctx = "\n".join(lines[-20:])
        basic_agent = BasicQueryAgent()
        reply_text = basic_agent.answer(content_text, context=ctx) or ""
        if not reply_text:
            reply_text = "Sorry, I could not generate a reply."

    ai_now = datetime.utcnow()
    ai_msg = ChatMessage(
        session_id=session.id,
        owner_id=user_id,
        role='assistant',
        content_text=reply_text,
        content_json=None,
        created_at=ai_now,
    )
    db.session.add(ai_msg)
    session.message_count = (session.message_count or 0) + 1
    session.last_message_at = ai_now
    session.updated_at = ai_now
    db.session.commit()

    return jsonify({'data': ai_msg.to_dict()}), 201
