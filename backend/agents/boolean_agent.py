import os
import json
from .gemini_client import generate

def generate_boolean_query(companies, titles, functions, geographies, description):
    """
    Uses Gemini to generate a precise Boolean query for Google X-Ray search.
    Normalize and rephrase inputs into a high-performance search string.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    model = "gemini-2.5-flash"  # Using the faster model as per project pattern

    if not api_key:
        return ""

    system_prompt = """You are an elite Technical Sourcer and Boolean Search Architect. Your task is to generate ONE high-precision Google X-Ray Boolean query to find highly relevant expert LinkedIn profiles.

INPUT DATA :
1.Target Companies
2.Target Titles (may be messy or descriptive)
3.Target Functions (may include generic keywords)
4.Target Geographies
5.Project Description Context

OBJECTIVE:
Generate a CLEAN, HIGH-PRECISION Google X-Ray Boolean query that maximizes relevance and minimizes noise.

---
CRITICAL RULES FOR BOOLEAN GENERATION:

1. TITLE-FIRST STRATEGY (PRECISION OVER RECALL):
- Extract REALISTIC LinkedIn job titles from the inputs. 
- Prioritize senior roles (C-level, VP, Head, Director) unless specific mid-level roles are requested.
- Convert vague phrases into real, common titles (e.g., "Senior technology leaders" → "CTO" OR "Chief Technology Officer" OR "VP Technology" OR "Head of Technology").
- Limit to a maximum of 10–12 highly accurate titles. Remove duplicates and junior variations.
- NEVER include generic standalone words as titles (e.g., do not use "Technology", "Digital", "Operations").

2. EXACT PHRASE MATCHING (MANDATORY):
- ANY title, company, or location containing more than one word MUST be wrapped in quotes. 
- Example: "Chief Technology Officer" OR "Tata Motors Finance" OR "South Korea"

3. COMPANY NAME CLEANUP:
- Strip out legal suffixes from company names to match how people write them on their profiles (e.g., remove "Inc.", "Pvt.", "Ltd.", "LLC").
- Put all cleaned company names in one OR block.

4. GOOGLE BOOLEAN SYNTAX (STRICT):
- Use `site:linkedin.com/in/` at the very beginning.
- Group categories using parentheses `(...)`.
- Use `OR` (capitalized) to separate terms inside parentheses.
- DO NOT use the word `AND` to combine the main blocks. Google naturally combines blocks separated by a space.
- Correct Structure: site:linkedin.com/in/ ("Title1" OR "Title2") ("Company1" OR "Company2") ("Location1" OR "Location2")

5. NEGATIVE FILTERS (MANDATORY):
- ALWAYS append this exact string at the end of the query: -intitle:"profiles" -inurl:"dir"

6. CHARACTER LIMIT AWARENESS:
- Keep the query as concise as possible while retaining the core strict filters (target ~300-350 characters max). Google ignores terms after 32 words, so prioritize the most critical companies and titles first.

7. OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include markdown code block formatting (like ```json), conversational text, or explanations. 
{
  "boolean_query": "[insert generated query here]"
}
"""

    user_text = f"""
Project Description: {description}
Target Companies: {companies}
Target Titles: {titles}
Target Functions (Seniority): {functions}
Target Geographies: {geographies}

Generate the boolean query."""

    try:
        response = generate(api_key, model, system_prompt, user_text, temperature=0.3)
        if not response:
            return _simple_boolean_fallback(companies, titles, functions, geographies)

        # Basic JSON cleanup
        clean_resp = response.strip()
        if clean_resp.startswith("```json"):
            clean_resp = clean_resp[7:]
        if clean_resp.startswith("```"):
            clean_resp = clean_resp[3:]
        if clean_resp.endswith("```"):
            clean_resp = clean_resp[:-3]

        data = json.loads(clean_resp.strip())
        return data.get("boolean_query", "") or _simple_boolean_fallback(companies, titles, functions, geographies)
    except Exception as e:
        print(f"BooleanAgent Gemini Error: {e}")
        return _simple_boolean_fallback(companies, titles, functions, geographies)

def _simple_boolean_fallback(companies, titles, functions, geographies):
    """Simple OR/AND fallback Boolean builder."""
    def _clean(val):
        if not val: return []
        if isinstance(val, list): return [v.strip() for v in val if v.strip()]
        return [v.strip() for v in str(val).split(',') if v.strip()]

    c_list = _clean(companies)
    t_list = _clean(titles) + _clean(functions)
    g_list = _clean(geographies)

    def _join_or(lst):
        return " OR ".join([f'"{x}"' if " " in x else x for x in lst])

    q = []
    if t_list: q.append(f"({_join_or(t_list)})")
    if c_list: q.append(f"({_join_or(c_list)})")
    if g_list: q.append(f"({_join_or(g_list)})")
    
    query = " AND ".join(q)
    return f"site:linkedin.com/in/ {query}" if query else ""
