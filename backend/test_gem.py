import os
import json
from dotenv import load_dotenv

load_dotenv('flask.env')
api_key = os.getenv('GEMINI_API_KEY')

from agents.gemini_client import generate

snippet = """
Senior Software Engineer · Oct 2023 - Present · 2 yrs 7 mos
Software Development Engineer · May 2022 - Oct 2023 · 1 yr 6 mos
Core Java, REST APIs and +8 skills
"""

system = "Extract an array of JSON objects containing 'position', 'companyName', 'startDate', 'endDate'. If no company, guess from context. Also return an array of 'skills'."

res = generate(api_key, "gemini-2.0-flash", system, f"Parse this:\n{snippet}")
print(res)
