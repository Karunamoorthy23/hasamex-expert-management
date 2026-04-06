import os
import sys
import json
from sqlalchemy import text
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.getcwd())

# Load env from the backend directory
load_dotenv('flask.env')

from app import create_app
from extensions import db

app = create_app()

def check_data():
    with app.app_context():
        try:
            res = db.session.execute(text("SELECT expert_id, compliance_onboarding FROM project_form_submissions LIMIT 10")).fetchall()
            for row in res:
                print(f"Expert: {row[0]}")
                print(f"Data: {json.dumps(row[1], indent=2)}")
                print("-" * 20)
        except Exception as e:
            print(f"Error checking data: {str(e)}")

if __name__ == "__main__":
    check_data()
