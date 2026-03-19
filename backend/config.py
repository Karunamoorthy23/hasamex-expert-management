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
    DB_PASSWORD = os.getenv('DB_PASSWORD', '').strip("'").strip('"')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '6543')
    DB_NAME = os.getenv('DB_NAME', 'postgres')

    # Check for full connection string
    DB_STRING = os.getenv('DB_STRING')
    if DB_STRING:
        # Force the use of port 6543 for Supabase if 5432 is in the string
        if 'supabase.co' in DB_STRING and ':5432' in DB_STRING:
            SQLALCHEMY_DATABASE_URI = DB_STRING.replace(':5432', ':6543')
        else:
            SQLALCHEMY_DATABASE_URI = DB_STRING
    else:
        # URL-encode the password to safely handle special characters
        _encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
        SQLALCHEMY_DATABASE_URI = (
            f"{DB_DRIVER}://{DB_USER}:{_encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'connect_args': {'connect_timeout': 10}
    }

    # CORS
    CORS_ORIGINS = os.getenv(
        'CORS_ORIGINS', 
        'https://hasamex-expert-management.vercel.app,http://localhost:5173,http://localhost:3000'
    ).split(',')

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
