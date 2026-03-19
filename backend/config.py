import os
from dotenv import load_dotenv

# Load environment variables from flask.env
load_dotenv(os.path.join(os.path.dirname(__file__), 'flask.env'))


import urllib.parse
import re
import socket
from urllib.parse import urlsplit, parse_qsl, urlencode, urlunsplit

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY')

    DB_STRING = (os.getenv('DATABASE_URL') or os.getenv('DB_STRING') or '').strip()
    DB_DRIVER = os.getenv('DB_DRIVER', 'postgresql')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '').strip().strip("'").strip('"')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    _default_port = '6543' if 'supabase.co' in DB_HOST else '5432'
    DB_PORT = os.getenv('DB_PORT', _default_port)
    DB_NAME = os.getenv('DB_NAME', 'postgres')

    if DB_STRING:
        _parts = urlsplit(DB_STRING)
        _query = dict(parse_qsl(_parts.query, keep_blank_values=True))
        if 'sslmode' not in _query:
            _query['sslmode'] = 'require'
        SQLALCHEMY_DATABASE_URI = urlunsplit((
            _parts.scheme,
            _parts.netloc,
            _parts.path,
            urlencode(_query),
            _parts.fragment
        ))
    else:
        DB_HOSTADDR = os.getenv('DB_HOSTADDR', '').strip()
        if not DB_HOSTADDR:
            try:
                _ipv4 = socket.getaddrinfo(DB_HOST, int(DB_PORT), socket.AF_INET, socket.SOCK_STREAM)
                if _ipv4:
                    DB_HOSTADDR = _ipv4[0][4][0]
            except Exception:
                DB_HOSTADDR = ''
        _encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
        _db_query_params = {'sslmode': 'require'}
        if DB_HOSTADDR:
            _db_query_params['hostaddr'] = DB_HOSTADDR
        _db_query = urllib.parse.urlencode(_db_query_params)
        SQLALCHEMY_DATABASE_URI = (
            f"{DB_DRIVER}://{DB_USER}:{_encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?{_db_query}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Connection Pooling Fix:
    # Use NullPool when connecting to Supabase/Render to prevent "hanging" connections.
    from sqlalchemy.pool import NullPool
    SQLALCHEMY_ENGINE_OPTIONS = {
        'poolclass': NullPool,
        'connect_args': {
            'connect_timeout': 10,
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5
        }
    }

    # CORS Configuration
    _default_origins = [
        'https://hasamex-expert-management.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080'
    ]
    _env_origins = os.getenv('CORS_ORIGINS', '')
    _normalized_env_origins = []
    if _env_origins:
        for item in _env_origins.split(','):
            origin = item.strip().strip('`').strip('"').strip("'")
            if not origin:
                continue
            if re.match(r'^https?://', origin, re.IGNORECASE) is None:
                origin = f"https://{origin}"
            _normalized_env_origins.append(origin)
    CORS_ORIGINS = list(dict.fromkeys(_default_origins + _normalized_env_origins))

    # Flask-Mail
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    
    # Safely handle MAIL_PORT
    _mail_port_raw = os.getenv('MAIL_PORT', '587')
    try:
        MAIL_PORT = int(_mail_port_raw) if _mail_port_raw else 587
    except ValueError:
        MAIL_PORT = 587

    _mail_timeout_raw = os.getenv('MAIL_TIMEOUT', '8')
    try:
        MAIL_TIMEOUT = int(_mail_timeout_raw) if _mail_timeout_raw else 8
    except ValueError:
        MAIL_TIMEOUT = 8
        
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'Hasamex <noreply@hasamex.com>')
