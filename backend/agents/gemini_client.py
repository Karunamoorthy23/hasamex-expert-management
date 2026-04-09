import requests

def generate(api_key: str, model: str, system_prompt: str, user_text: str, temperature: float = 0.7, top_p: float = 0.95, max_output_tokens: int = 2048) -> str:
    if not api_key or not model or not user_text:
        print("GEMINI_GENERATE_MISSING_INPUT")
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": user_text}]}
        ],
        "generationConfig": {
            "temperature": temperature,
            "topP": top_p,
            "maxOutputTokens": max_output_tokens
        }
    }
    if system_prompt:
        payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}
    try:
        r = requests.post(url, json=payload, timeout=30)
        if r.status_code != 200:
            try:
                j = r.json()
                print(f"GEMINI_HTTP_ERROR {r.status_code} {j}")
            except Exception:
                print(f"GEMINI_HTTP_ERROR {r.status_code} {r.text}")
            return ""
        data = r.json() or {}
        if "promptFeedback" in data:
            pf = data.get("promptFeedback") or {}
            br = pf.get("blockReason")
            if br:
                print(f"GEMINI_BLOCKED {br}")
                return ""
        cands = data.get("candidates") or []
        if not cands:
            print("GEMINI_NO_CANDIDATES")
            return ""
        content = cands[0].get("content") or {}
        parts = content.get("parts") or []
        texts = []
        for p in parts:
            t = p.get("text")
            if isinstance(t, str):
                texts.append(t)
        return "\n".join(texts).strip()
    except Exception:
        print(f"GEMINI_EXCEPTION {e}")
        return ""

