import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('flask.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in flask.env")

engine = create_engine(DATABASE_URL)

migration_path = os.path.join(os.path.dirname(__file__), 'migrations', '043_jsonb_poc_users_ids.sql')

with open(migration_path, 'r') as f:
    sql = f.read()

with engine.connect() as conn:
    print(f"Executing {migration_path}...")
    conn.execute(text(sql))
    conn.commit()
    print("Migration 043_jsonb_poc_users_ids complete.")
