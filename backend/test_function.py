from app import create_app
from routes.users import get_user_filter_options

app = create_app()

with app.app_context():
    print("Executing get_user_filter_options...")
    try:
        response = get_user_filter_options()
        print(response.get_json())
    except Exception as e:
        import traceback
        traceback.print_exc()
