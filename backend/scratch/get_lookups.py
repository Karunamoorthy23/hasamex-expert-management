from app import create_app
from models import LkCompanyRole, LkLocation, LkRegion
import json

app = create_app()
with app.app_context():
    count = LkLocation.query.count()
    print(f"TOTAL LOCATIONS: {count}")
    first = LkLocation.query.first()
    if first:
        print(f"FIRST: {first.display_name} | {first.timezone}")
