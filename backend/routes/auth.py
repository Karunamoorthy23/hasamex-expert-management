import os
import secrets
from datetime import datetime, timedelta
from threading import Thread

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from flask import Blueprint, jsonify, request, render_template, current_app
from flask_mail import Message

from auth import create_access_token, require_auth
from extensions import db, mail
from models import HasamexPasswordResetToken, HasamexUser, HasamexOTP


auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

_ph = PasswordHasher()


def _now_utc():
    return datetime.utcnow()


def _send_otp_email_async(app, message):
    with app.app_context():
        try:
            mail.send(message)
        except Exception as e:
            print(f"Async mail send failed: {e}")


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
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
    except Exception as e:
        print(f"CRITICAL LOGIN ERROR: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500


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


@auth_bp.route('/request-otp', methods=['POST'])
def request_otp():
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'Email is required'}), 400

        user = HasamexUser.query.filter(HasamexUser.email.ilike(email)).first()
        if not user or user.is_active is False:
            return jsonify({'message': 'If this email exists, an OTP will be sent.'})

        import random
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        expires_at = _now_utc() + timedelta(minutes=2)

        HasamexOTP.query.filter_by(email=email).delete(synchronize_session=False)
        new_otp = HasamexOTP(email=email, otp=otp, expires_at=expires_at)
        db.session.add(new_otp)
        db.session.commit()

        msg = Message(
            subject="Hasamex - Your Password Reset OTP",
            recipients=[email],
            html=render_template('otp_email.html', otp=otp)
        )

        app = current_app._get_current_object()
        Thread(target=_send_otp_email_async, args=(app, msg), daemon=True).start()
        return jsonify({'message': 'If this email exists, an OTP will be sent.'})
    except Exception as e:
        print(f"Error handling OTP request: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()

    if not email or not otp:
        return jsonify({'error': 'Email and OTP are required'}), 400

    record = HasamexOTP.query.filter_by(email=email, otp=otp).first()
    if not record:
        return jsonify({'error': 'Invalid OTP'}), 400

    if record.expires_at < _now_utc():
        db.session.delete(record)
        db.session.commit()
        return jsonify({'error': 'OTP expired'}), 400

    # OTP is valid, now generate a password reset token
    user = HasamexUser.query.filter(HasamexUser.email.ilike(email)).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    token = secrets.token_urlsafe(48)
    expires_at = _now_utc() + timedelta(minutes=15)

    # Invalidate existing tokens for this user
    HasamexPasswordResetToken.query.filter_by(hasamex_user_id=user.id).delete(synchronize_session=False)

    prt = HasamexPasswordResetToken(hasamex_user_id=user.id, token=token, expires_at=expires_at)
    db.session.add(prt)
    
    # Delete the used OTP
    db.session.delete(record)
    db.session.commit()

    frontend_base = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')
    reset_link = f"{frontend_base}/reset-password?token={token}"

    return jsonify({'message': 'OTP verified', 'reset_token': token, 'reset_link': reset_link})


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

