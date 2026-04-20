import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('flask.env')

user = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
host = os.getenv('DB_HOST')
port = os.getenv('DB_PORT')
db_name = os.getenv('DB_NAME')

db_url = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Adding expert_timezone...")
    try:
        conn.execute(text("ALTER TABLE engagements ADD COLUMN expert_timezone VARCHAR(100)"))
        conn.commit()
        print("Success")
    except Exception as e:
        print(f"Error or already exists: {e}")
        
    print("Adding client_timezone...")
    try:
        conn.execute(text("ALTER TABLE engagements ADD COLUMN client_timezone VARCHAR(100)"))
        conn.commit()
        print("Success")
    except Exception as e:
        print(f"Error or already exists: {e}")
