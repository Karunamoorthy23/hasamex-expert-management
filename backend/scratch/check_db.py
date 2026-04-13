from app import app
from models import Expert, ExpertExperience
with app.app_context():
    count = Expert.query.count()
    print(f"Total Experts: {count}")
    if count > 0:
        latest = Expert.query.order_by(Expert.created_at.desc()).first()
        print(f"Latest Expert: {latest.full_name} ({latest.linkedin_url})")
        exps = ExpertExperience.query.filter_by(expert_id=latest.expert_id).count()
        print(f"Experience rows for latest: {exps}")
