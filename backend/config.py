import os
from dotenv import load_dotenv

# Load environment variables from flask.env
load_dotenv(os.path.join(os.path.dirname(__file__), 'flask.env'))


import urllib.parse

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY')

    # PostgreSQL Database
    DB_DRIVER = os.getenv('DB_DRIVER', 'postgresql')
    DB_USER = os.getenv('DB_USER', 'postgres')
    # Extremely robust password handling: strip whitespace and all types of quotes
    DB_PASSWORD = os.getenv('DB_PASSWORD', '').strip().strip("'").strip('"')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    
    # Smart Port Selection: 
    # Use 6543 (Pooler) for Supabase on Render to avoid IPv6/Timeout issues.
    _default_port = '6543' if 'supabase.co' in DB_HOST else '5432'
    DB_PORT = os.getenv('DB_PORT', _default_port)
    
    DB_NAME = os.getenv('DB_NAME', 'postgres')

    # URL-encode the password to safely handle special characters like '@'
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
    if _env_origins:
        CORS_ORIGINS = list(set(_default_origins + [o.strip() for o in _env_origins.split(',') if o.strip()]))
    else:
        CORS_ORIGINS = _default_origins

    # Flask-Mail
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    
    # Safely handle MAIL_PORT
    _mail_port_raw = os.getenv('MAIL_PORT', '587')
    try:
        MAIL_PORT = int(_mail_port_raw) if _mail_port_raw else 587
    except ValueError:
        MAIL_PORT = 587
        
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'Hasamex <noreply@hasamex.com>')
