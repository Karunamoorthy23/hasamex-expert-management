import os
from app import create_app

app = create_app()

with app.test_client() as client:
    # We must provide authorization headers, let's just make a fake token or watch it hit the Auth error
    print("Fetching /api/v1/users/summary...")
    response = client.get('/api/v1/users/summary')
    
    # Actually wait we can bypass auth for local debugging or just mock it. Let's see the global error trace.
    print(response.status_code)
    print(response.get_json())
