from app import create_app
from extensions import db
from models import Expert
from datetime import datetime, date

app = create_app()
with app.app_context():
    today = date.today()
    experts = Expert.query.filter(Expert.created_at >= today).all()
    print(f"Total experts created today ({today}): {len(experts)}")
    for e in experts:
        print(f"- {e.full_name} | {e.primary_email} | {e.linkedin_url}")
