import os
import secrets
from datetime import datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from flask import Blueprint, jsonify, request

from auth import create_access_token, require_auth
from extensions import db
from models import HasamexPasswordResetToken, HasamexUser


auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

_ph = PasswordHasher()


def _now_utc():
    return datetime.utcnow()


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = HasamexUser.query.filter(HasamexUser.email.ilike(email)).first()
    if not user or not user.email:
        return jsonify({'error': 'Access Denied'}), 403

    if user.is_active is False:
        return jsonify({'error': 'Access Denied'}), 403

    try:
        _ph.verify(user.password_hash, password)
    except VerifyMismatchError:
        return jsonify({'error': 'Access Denied'}), 403

    expires_hours = int(os.getenv('JWT_EXPIRES_HOURS', '24'))
    token = create_access_token(
        {
            'user_id': user.id,
            'email': user.email,
            'role': user.role,
        },
        expires_hours=expires_hours,
    )

    return jsonify(
        {
            'access_token': token,
            'token_type': 'Bearer',
            'expires_in': expires_hours * 60 * 60,
            'user': {
                'user_id': user.id,
                'email': user.email,
                'role': user.role,
            },
        }
    )


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    claims = getattr(request, 'jwt_claims', {}) or {}
    user_id = claims.get('user_id')
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401

    user = HasamexUser.query.get(user_id)
    if not user or user.is_active is False:
        return jsonify({'error': 'Invalid token'}), 401

    return jsonify(
        {
            'data': {
                'user_id': user.id,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'username': user.username,
            }
        }
    )


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = HasamexUser.query.filter(HasamexUser.email.ilike(email)).first()
    if not user or user.is_active is False:
        # Do not leak account existence
        return jsonify({'message': 'If this email exists, a reset link will be sent.'})

    token = secrets.token_urlsafe(48)
    expires_at = _now_utc() + timedelta(minutes=15)

    # Invalidate existing tokens for this user
    HasamexPasswordResetToken.query.filter_by(hasamex_user_id=user.id).delete(synchronize_session=False)

    prt = HasamexPasswordResetToken(hasamex_user_id=user.id, token=token, expires_at=expires_at)
    db.session.add(prt)
    db.session.commit()

    frontend_base = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')
    reset_link = f"{frontend_base}/reset-password?token={token}"

    # NOTE: Email sending is not wired; returning link helps dev/test.
    return jsonify({'message': 'Reset link generated', 'reset_link': reset_link})


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = (data.get('token') or '').strip()
    new_password = data.get('new_password') or ''
    confirm_password = data.get('confirm_password') or ''

    if not token:
        return jsonify({'error': 'Token is required'}), 400
    if not new_password or not confirm_password:
        return jsonify({'error': 'New password and confirm password are required'}), 400
    if new_password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    prt = HasamexPasswordResetToken.query.filter_by(token=token).first()
    if not prt:
        return jsonify({'error': 'Invalid or expired token'}), 400

    if prt.expires_at < _now_utc():
        db.session.delete(prt)
        db.session.commit()
        return jsonify({'error': 'Invalid or expired token'}), 400

    user = HasamexUser.query.get(prt.hasamex_user_id)
    if not user or user.is_active is False:
        db.session.delete(prt)
        db.session.commit()
        return jsonify({'error': 'Invalid or expired token'}), 400

    user.password_hash = _ph.hash(new_password)
    db.session.delete(prt)
    db.session.commit()

    return jsonify({'message': 'Password reset successful'})

