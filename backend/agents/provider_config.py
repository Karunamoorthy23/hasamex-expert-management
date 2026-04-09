import os

def get_llm_provider():
    v = os.getenv('LLM_PROVIDER', 'gemini')
    return (v or 'gemini').strip().lower()

def get_gemini_model():
    v = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
    return (v or 'gemini-2.0-flash').strip()

def get_gemini_api_key():
    v = os.getenv('GEMINI_API_KEY', '')
    return (v or '').strip()

