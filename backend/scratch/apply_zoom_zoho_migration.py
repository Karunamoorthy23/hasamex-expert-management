import os
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv('flask.env')

user = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
host = os.getenv('DB_HOST')
port = os.getenv('DB_PORT')
db_name = os.getenv('DB_NAME')

safe_password = quote_plus(password)
db_url = f"postgresql://{user}:{safe_password}@{host}:{port}/{db_name}"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Applying Zoom and Zoho migration...")
    try:
        conn.execute(text("ALTER TABLE engagements ADD COLUMN zoom_meeting_id VARCHAR(100)"))
        conn.execute(text("ALTER TABLE engagements ADD COLUMN zoom_join_url TEXT"))
        conn.execute(text("ALTER TABLE engagements ADD COLUMN zoom_start_url TEXT"))
        conn.execute(text("ALTER TABLE engagements ADD COLUMN zoom_password VARCHAR(100)"))
        conn.execute(text("ALTER TABLE engagements ADD COLUMN zoho_event_id_expert VARCHAR(100)"))
        conn.execute(text("ALTER TABLE engagements ADD COLUMN zoho_event_id_client VARCHAR(100)"))
        conn.commit()
        print("Migration applied successfully.")
    except Exception as e:
        print(f"Migration error or columns already exist: {e}")
