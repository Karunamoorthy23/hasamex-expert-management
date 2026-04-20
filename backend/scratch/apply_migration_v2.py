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

# URL encode the password to handle characters like '@'
safe_password = quote_plus(password)

db_url = f"postgresql://{user}:{safe_password}@{host}:{port}/{db_name}"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Checking/Adding expert_timezone...")
    try:
        conn.execute(text("ALTER TABLE engagements ADD COLUMN expert_timezone VARCHAR(100)"))
        conn.commit()
        print("Expert timezone column added.")
    except Exception as e:
        print(f"Expert timezone column already exists or error: {e}")
        
    print("Checking/Adding client_timezone...")
    try:
        conn.execute(text("ALTER TABLE engagements ADD COLUMN client_timezone VARCHAR(100)"))
        conn.commit()
        print("Client timezone column added.")
    except Exception as e:
        print(f"Client timezone column already exists or error: {e}")
