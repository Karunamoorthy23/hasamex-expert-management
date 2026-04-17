import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app
from models import db, Project

with app.app_context():
    project = Project.query.first()
    if project:
        print(f"Project ID: {project.project_id}")
        print(f"Leads: {project.leads_expert_ids}")
        print(f"Invited: {project.invited_expert_ids}")
        print(f"Accepted: {project.accepted_expert_ids}")
        print(f"Scheduled: {project.expert_scheduled}")
        print(f"Completed: {project.expert_call_completed}")
    else:
        print("No projects found.")
