import os
import sys
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
            # Check the first row's project_questions
            res = db.session.execute(text("SELECT project_id, project_questions FROM projects LIMIT 5")).fetchall()
            for row in res:
                print(f"ID: {row[0]}, Qs: {row[1]}")
        except Exception as e:
            print(f"Error checking data: {str(e)}")

if __name__ == "__main__":
    check_data()
