import sys
import os
from dotenv import load_dotenv

# Load API keys from flask.env
load_dotenv('flask.env')

# Append current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routes.n8n_webhook import _refine_search_criteria_with_llm

companies = [
    "Squareshift Technologies",
    "Orifarm"
]
roles = [
    "Supply Chain Management (titles like Procurement Manager)",
    "Senior Strategic Softgel Procurement Director"
    "Senior Manager - Supply Chain"
]

print("RAW COMPANIES:", companies)
print("RAW ROLES:", roles)

print("\nRunning through Gemini LLM filter...")
boolean_query = _refine_search_criteria_with_llm(companies, roles)

print("\nAI GENERATED BOOLEAN QUERY:", boolean_query)
