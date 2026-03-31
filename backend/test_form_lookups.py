from app import create_app
from routes.users import get_user_form_lookups

app = create_app()

with app.app_context():
    print("Executing get_user_form_lookups...")
    try:
        response = get_user_form_lookups()
        data = response.get_json()
        print(f"Success! Found {len(data['clients'])} clients and {len(data['hasamex_users'])} hasamex users.")
    except Exception as e:
        import traceback
        traceback.print_exc()
