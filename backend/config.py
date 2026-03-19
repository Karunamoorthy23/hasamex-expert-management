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
    # Extremely robust password handling: strip whitespace and all types of quotes
    DB_PASSWORD = os.getenv('DB_PASSWORD', '').strip().strip("'").strip('"')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    
    # As requested, default to 5431 if not specified, otherwise use 5432 or 6543 logic
    _default_port = os.getenv('DB_PORT', '5431')
    DB_PORT = _default_port
    
    DB_NAME = os.getenv('DB_NAME', 'postgres')

    if DB_STRING:
        # If DB_STRING is provided, we need to handle passwords with '@' correctly.
        # urlsplit is not robust for passwords with '@'.
        # We manually parse the scheme, netloc (user:pass@host:port), and path.
        try:
            if '://' in DB_STRING:
                scheme, rest = DB_STRING.split('://', 1)
                if '/' in rest:
                    netloc, path_part = rest.split('/', 1)
                    path = '/' + path_part
                else:
                    netloc = rest
                    path = ''
                
                # In netloc, the LAST '@' separates user:pass from host:port
                if '@' in netloc:
                    user_pass, host_port = netloc.rsplit('@', 1)
                    if ':' in user_pass:
                        user, password = user_pass.split(':', 1)
                        # Encode password to handle special characters like '@'
                        encoded_pass = urllib.parse.quote_plus(password)
                        netloc = f"{user}:{encoded_pass}@{host_port}"
                
                # Add sslmode=require if missing
                if 'sslmode' not in path:
                    separator = '&' if '?' in path else '?'
                    path += f"{separator}sslmode=require"
                
                SQLALCHEMY_DATABASE_URI = f"{scheme}://{netloc}{path}"
            else:
                SQLALCHEMY_DATABASE_URI = DB_STRING
        except Exception as e:
            print(f"ERROR PARSING DB_STRING: {e}")
            SQLALCHEMY_DATABASE_URI = DB_STRING
    else:
        # Fallback to component-based URI building
        _encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
        SQLALCHEMY_DATABASE_URI = (
            f"{DB_DRIVER}://{DB_USER}:{_encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require"
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
