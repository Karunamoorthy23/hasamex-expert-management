import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import request, jsonify


def _jwt_secret():
    secret = os.getenv('JWT_SECRET') or os.getenv('SECRET_KEY')
    if not secret:
        raise RuntimeError('JWT_SECRET is not set')
    return secret


def create_access_token(payload: dict, expires_hours: int = 24) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=expires_hours)
    token_payload = {
        **payload,
        'iat': int(now.timestamp()),
        'exp': int(exp.timestamp()),
    }
    return jwt.encode(token_payload, _jwt_secret(), algorithm='HS256')


def decode_token(token: str) -> dict:
    return jwt.decode(token, _jwt_secret(), algorithms=['HS256'])


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get('Authorization') or ''
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        token = auth.split(' ', 1)[1].strip()
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        try:
            claims = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401

        request.jwt_claims = claims  # type: ignore[attr-defined]
        return fn(*args, **kwargs)

    return wrapper

