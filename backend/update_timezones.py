import os
import sys

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import LkLocation
from utils.timezone_util import find_iana_timezone

def update_timezones():
    app = create_app()
    with app.app_context():
        locations = LkLocation.query.all()
        updated_count = 0
        
        print(f"Found {len(locations)} locations to check.")
        
        for loc in locations:
            if not loc.display_name:
                continue
                
            # Use our existing utility to get the correct IANA timezone
            new_tz = find_iana_timezone(loc.display_name)
            
            if new_tz and loc.timezone != new_tz:
                print(f"Updating '{loc.display_name}': {loc.timezone} -> {new_tz}")
                loc.timezone = new_tz
                updated_count += 1
                
        if updated_count > 0:
            db.session.commit()
            print(f"\nSuccessfully updated {updated_count} timezones in lk_location.")
        else:
            print("\nNo timezones needed updating.")

if __name__ == "__main__":
    update_timezones()
