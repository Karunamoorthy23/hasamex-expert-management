from app import create_app
from routes.users import get_users_summary

app = create_app()

with app.test_request_context('/api/v1/users/summary?page=1&limit=20&search='):
    print("Executing get_users_summary...")
    try:
        response = get_users_summary()
        data = response.get_json()
        print(f"Success! Returned {len(data['data'])} users")
    except Exception as e:
        import traceback
        traceback.print_exc()
