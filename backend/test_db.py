import os
from dotenv import load_dotenv
import urllib.parse

load_dotenv('flask.env')

DB_DRIVER = os.getenv('DB_DRIVER')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD', '').strip("'").strip('"')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')

_encoded_password = urllib.parse.quote_plus(DB_PASSWORD)

uri = f"{DB_DRIVER}://{DB_USER}:{_encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
print(f"URI: {uri}")

try:
    import psycopg2
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    print("Direct connection success!")
    conn.close()
except Exception as e:
    print(f"Direct connection failed: {e}")
