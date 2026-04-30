import os
import time
from apify_client import ApifyClient
from dotenv import load_dotenv

def get_apify_contact(linkedin_url):
    """
    Scrape LinkedIn profile using Apify's No-Cookie Scraper.
    Actor: get-leads/linkedin-scraper
    """
    # Determine the path to flask.env
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(os.path.dirname(current_dir), 'flask.env')
    load_dotenv(env_path)
    
    api_token = os.getenv('APIFY_API_TOKEN')
    
    if not api_token:
        print(f"Error: APIFY_API_TOKEN is not set in {env_path}")
        return

    # Initialize the ApifyClient with your API token
    client = ApifyClient(api_token)

    print(f"1. Starting Apify 'LinkedIn Scraper - No Cookies' for: {linkedin_url}")
    print("   (This uses search engines and public view, no li_at cookie needed)")

    # Prepare the Actor input
    run_input = {
        "urls": [linkedin_url]
    }

    try:
        # Run the actor and wait for it to finish
        run = client.actor("get-leads/linkedin-scraper").call(run_input=run_input)

        # Fetch Actor results from the run's dataset
        print("   Run finished! Fetching results...")
        
        results = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append(item)

        if not results:
            print("\n[!] Apify returned no data. The profile might be private or not indexed.")
            return

        # Process the first result
        profile = results[0]
        
        print("\n" + "="*50)
        print(f"SUCCESS: Scraped Profile : {profile.get('name', 'Unknown')}")
        print(f"Headline     : {profile.get('headline', 'N/A')}")
        print(f"Location     : {profile.get('location', 'N/A')}")
        print(f"Company Web  : {profile.get('company_website', 'N/A')}")
        print(f"Connections  : {profile.get('connections_count', 'N/A')}")
        
        # Experience
        experience = profile.get('experience', [])
        if experience:
            print("\nExperience:")
            for exp in experience[:3]:  # Show top 3
                title = exp.get('title', 'N/A')
                company = exp.get('company', 'N/A')
                dates = exp.get('date_range', 'N/A')
                print(f"  * {title} at {company} ({dates})")
        else:
            print("\nExperience: Not found (Publicly hidden or not indexed)")
        
        # Education
        education = profile.get('education', [])
        if education:
            print("\nEducation:")
            for edu in education[:2]:
                school = edu.get('school', 'N/A')
                degree = edu.get('degree', 'N/A')
                print(f"  * {school} - {degree}")

        # Emails (though this actor usually doesn't get them without extra steps/credits)
        email = profile.get('email')
        if email:
            print(f"\nEmail: [OK] {email}")
        
        print("="*50)

    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")

if __name__ == "__main__":
    # Test with the URL the user is working with
    test_url = "https://www.linkedin.com/in/deepa-murugan0712/"
    get_apify_contact(test_url)
