import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('flask.env')
engine = create_engine(os.environ['DATABASE_URL'])

with engine.begin() as conn:
    with open('migrations/044_add_expert_call_date_to_engagements.sql', 'r') as f:
        sql = f.read()
        conn.execute(text(sql))
print("Migration 044 applied successfully.")
