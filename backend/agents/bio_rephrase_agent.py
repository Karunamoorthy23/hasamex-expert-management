"""
bio_rephrase_agent.py
=====================
AI agent that rewrites or generates a professional third-person bio
for an expert, using the raw PDF text extracted by pdf_expert_agent.

The raw text is passed directly — no extra API calls for extraction,
just one focused bio-generation call using the already-available text.

Returns: The polished bio string, or None if generation failed.
"""

import os
import time
import requests

MAX_RETRIES   = 2
RETRY_BACKOFF = [5, 15]

# ── System prompt ─────────────────────────────────────────────────────────────

BIO_AGENT_SYSTEM_PROMPT = """
You are an expert content writer specialising in professional bios for enterprise and consulting use cases.

Task:
Using the raw text from an expert's CV or profile, write a polished, third-person, company-style professional biography.

Requirements:
1. Write strictly in THIRD PERSON. DO NOT USE THE EXPERT'S NAME ANYWHERE IN THE BIOGRAPHY. From start to finish, use ONLY appropriate pronouns (He, She, His, Her, Him) to refer to the expert.
2. Maintain a formal, corporate tone similar to executive or consulting profiles.
3. Do NOT add any information that is not present in the input text.
4. Preserve ALL key facts: years of experience, company names, roles, responsibilities, technologies, tools, achievements, and impact metrics (e.g., percentages, results).
5. Structure the output into clear paragraphs:
   - Introduction (experience + specialisation)
   - Previous role(s) and contributions
   - Current role and responsibilities
   - Key expertise summary
6. Expand slightly for clarity and professionalism, but avoid fluff or exaggeration.
7. Ensure readability and logical flow.
8. VERBOSITY AND LENGTH — CRITICAL: 
   - DO NOT SUMMARIZE. 
   - DO NOT COMPRESS.
   - If the original profile contains a bio, summary, or "About" section, the output biography MUST be at least as long as the original text. 
   - If the input is 1000 characters, your output should be 1000 characters or more.
   - Elaborate on each achievement and role mentioned in the source.
   - Ensure the level of detail matches or exceeds the original.
   - COMPLETENESS: Ensure the biography is completed fully. Do NOT truncate or cut off mid-sentence.

Tone: Professional, Neutral, Confident but not promotional. Suitable for client-facing documentation.

Output Format:
- Minimum 2-3 detailed paragraphs; use more paragraphs if the source material is extensive.
- No bullet points.
- No headings.
- No emojis.
- Output ONLY the biography text — no preamble, no explanation.
""".strip()


# ── Gemini call ───────────────────────────────────────────────────────────────

def _call_gemini_for_bio(user_text: str) -> str:
    """Call Gemini to generate/rephrase bio. Returns the bio string or ''."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    model   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    if not api_key:
        print("BIO_AGENT: GEMINI_API_KEY not set")
        return ""

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/{model}:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "systemInstruction": {"parts": [{"text": BIO_AGENT_SYSTEM_PROMPT}]},
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.95,
            "maxOutputTokens": 4096,
        },
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.post(url, json=payload, timeout=60)

            if resp.status_code == 429:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                print(f"BIO_AGENT: 429 rate-limited — retrying in {wait}s...")
                time.sleep(wait)
                continue

            if resp.status_code != 200:
                print(f"BIO_AGENT: Gemini error {resp.status_code}: {resp.text[:200]}")
                return ""

            data  = resp.json() or {}
            cands = data.get("candidates") or []
            if not cands:
                print("BIO_AGENT: No candidates returned")
                return ""

            parts = (cands[0].get("content") or {}).get("parts") or []
            reason = cands[0].get("finishReason")
            if reason and reason != "STOP":
                print(f"BIO_AGENT WARNING: Generation stopped with reason: {reason}")
                
            bio   = "\n".join(
                p.get("text", "") for p in parts if isinstance(p.get("text"), str)
            ).strip()
            print(f"BIO_AGENT: Generated bio ({len(bio)} chars)")
            return bio

        except Exception as e:
            wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
            print(f"BIO_AGENT: Request exception (attempt {attempt+1}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(wait)

    print("BIO_AGENT: All retries exhausted")
    return ""


# ── Public entry point ────────────────────────────────────────────────────────

def rephrase_or_generate_bio(pdf_text: str, extracted_data: dict) -> str | None:
    """
    Generate or rephrase a professional third-person bio.

    Strategy:
    - If the extraction found a substantial bio (>= 200 chars): rephrase it in full,
      supplementing with employment history from the PDF for extra context.
    - If bio is short (< 200 chars) or missing: use the full raw PDF text so the
      model can synthesise a bio from all available profile data.

    Args:
        pdf_text:       Raw text extracted from the PDF (pdfplumber output).
        extracted_data: Structured dict from Gemini extraction step.

    Returns:
        A polished third-person biography string, or None on failure.
    """
    if not pdf_text or not pdf_text.strip():
        print("BIO_AGENT: No PDF text provided — skipping")
        return None

    name  = f"{extracted_data.get('first_name', '')} {extracted_data.get('last_name', '')}".strip()
    title = (extracted_data.get("title_headline") or "").strip()
    raw_bio = (extracted_data.get("bio") or "").strip()

    header_lines = []
    if name:
        header_lines.append(f"Expert Name: {name}")
    if title:
        header_lines.append(f"Current Title: {title}")
    header_lines.append("")

    if len(raw_bio) >= 200:
        # Mode 1: Substantial bio found — rephrase it completely
        print(f"BIO_AGENT: Mode=REPHRASE | bio={len(raw_bio)} chars")
        header_lines.append(
            "Rephrase the following expert's own bio into a polished third-person professional biography. "
            "Include EVERY piece of information from the bio — all companies, roles, technologies, "
            "achievements, and metrics. \n\n"
            f"CRITICAL: The original bio is {len(raw_bio)} characters long. Your output MUST be at least "
            f"as long as the original ({len(raw_bio)} characters or more). DO NOT SUMMARIZE. "
            "Elaborate on every point to ensure full coverage and maximum detail."
        )
        header_lines.append("")
        header_lines.append("Original Bio (rephrase this in full):")
        header_lines.append(raw_bio)

        # Supplement with employment history for richer context
        emp = extracted_data.get("employment_history") or []
        if emp:
            header_lines.append("")
            header_lines.append("Additional employment context from profile:")
            for job in emp:
                end = job.get("end_year") or "Present"
                header_lines.append(
                    f"  - {job.get('role', 'Professional')} at {job.get('company', 'Unknown')} "
                    f"({job.get('start_year', '?')} – {end})"
                )
    else:
        # Mode 2: Short/no bio — generate from full PDF text
        print(f"BIO_AGENT: Mode=GENERATE | bio={len(raw_bio)} chars (short) — using full PDF text")
        raw_snippet = pdf_text[:5000].strip()
        header_lines.append(
            "Generate a professional third-person biography from this expert's complete profile text. "
            "Cover all experience, roles, skills, and achievements found in the text."
        )
        header_lines.append("")
        header_lines.append("Full Profile Text:")
        header_lines.append(raw_snippet)

    user_text = "\n".join(header_lines)
    print(f"BIO_AGENT: Sending {len(user_text)} char prompt to Gemini")

    bio = _call_gemini_for_bio(user_text)
    return bio if bio else None
