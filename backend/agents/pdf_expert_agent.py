"""
pdf_expert_agent.py
====================
AI agent that parses an expert profile PDF using pdfplumber (text extraction)
+ Gemini plain-text prompt. No File API, no quota issues.

Flow:
  1. Extract text from PDF using pdfplumber.
  2. Send extracted text to Gemini as a plain-text prompt.
  3. Retry up to MAX_RETRIES times on 429 with exponential backoff.
  4. Parse the JSON response.
  5. Upsert the expert in the DB (smart merge if duplicate).
  6. Add expert as Lead to the given project.

Returns: { status: 'created'|'updated'|'duplicate'|'error', expert_id, name, message, filename }
"""

import os
import json
import re
import time

import requests as _requests


# ─── Config ──────────────────────────────────────────────────────────────────

MAX_RETRIES   = 3
RETRY_BACKOFF = [5, 15, 30]   # seconds to wait before each retry


def _get_gemini_cfg():
    api_key = os.getenv("GEMINI_API_KEY", "")
    model   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    return api_key, model


# ─── System prompt ────────────────────────────────────────────────────────────

EXTRACTION_SYSTEM_PROMPT = """
You are a professional data extractor for an expert management system.
Given the plain text extracted from an expert's CV or professional profile PDF,
extract all available information and return it as a single raw JSON object.
No markdown, no code fences, no explanation — ONLY the JSON object.

Return EXACTLY this JSON schema:
{
  "first_name": "string or null",
  "last_name": "string or null",
  "salutation": "Mr/Mrs/Ms/Dr/Prof or null",
  "primary_email": "email string or null",
  "secondary_email": "email string or null",
  "primary_phone": "phone string or null",
  "secondary_phone": "phone string or null",
  "linkedin_url": "full linkedin URL or null",
  "location": "City, Country string or null",
  "region": "one of: North America, South America, Europe, Middle East, Africa, South Asia, East Asia, Southeast Asia, Australia/Pacific or null",
  "timezone": "IANA timezone string e.g. Asia/Kolkata or null",
  "title_headline": "current job title and company e.g. VP of Product at Acme Corp or null",
  "bio": "2-4 sentence professional bio or null",
  "current_employment_status": "one of: Employed, Self-Employed, Consultant, Retired, Unemployed or null",
  "seniority": "one of: C-Suite, VP, Director, Manager, Senior, Mid-Level, Junior or null",
  "years_of_experience": integer or null,
  "primary_sector": "main industry sector string or null",
  "expert_function": "primary function e.g. Sales, Operations, Finance, Technology, Marketing or null",
  "company_role": "most recent company role descriptor or null",
  "strength_topics": "comma-separated list of key expertise areas or null",
  "employment_history": [
    {
      "company": "company name",
      "role": "job title",
      "start_year": integer or null,
      "end_year": integer or null
    }
  ],
  "education": [
    {
      "institution": "university/institution name",
      "degree": "degree type e.g. Bachelor of Science, MBA, PhD",
      "field": "field of study e.g. Computer Science",
      "start_year": integer or null,
      "end_year": integer or null
    }
  ]
}

Rules:
- Extract ALL employment history entries visible in the text.
- Extract ALL education entries visible.
- If information is not present, use null — do NOT invent data.
- employment_history: most recent first, end_year = null means "Present".
- Return ONLY the JSON object, nothing else.
""".strip()


# ─── Step 1: Extract text from PDF ───────────────────────────────────────────

def _extract_pdf_text(file_path: str) -> str:
    """
    Extract plain text from a PDF using pdfplumber.
    Falls back to PyPDF2 if pdfplumber is unavailable.
    Returns extracted text string, or raises RuntimeError.
    """
    # Primary: pdfplumber
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        text = "\n".join(pages).strip()
        if text:
            print(f"PDF_AGENT: Extracted {len(text)} chars via pdfplumber")
            return text
    except ImportError:
        pass
    except Exception as e:
        print(f"PDF_AGENT: pdfplumber failed: {e}")

    # Fallback: PyPDF2
    try:
        import PyPDF2
        pages = []
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        text = "\n".join(pages).strip()
        if text:
            print(f"PDF_AGENT: Extracted {len(text)} chars via PyPDF2")
            return text
    except ImportError:
        pass
    except Exception as e:
        print(f"PDF_AGENT: PyPDF2 failed: {e}")

    raise RuntimeError(
        "No PDF text extraction library found. "
        "Run: pip install pdfplumber"
    )


# ─── Step 2: Send text to Gemini with retry ───────────────────────────────────

def _call_gemini(api_key: str, model: str, pdf_text: str) -> str:
    """
    Send extracted PDF text to Gemini as a plain-text prompt.
    Retries on 429 with exponential backoff.
    Returns the raw response text or empty string.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    # Truncate to ~60k chars to stay within token limits
    truncated = pdf_text[:60_000]

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Here is the extracted text from an expert's profile PDF:\n\n"
                            f"---\n{truncated}\n---\n\n"
                            "Extract all expert information and return ONLY a raw JSON object "
                            "exactly matching the schema in the system instruction. "
                            "No markdown, no code fences."
                        )
                    }
                ]
            }
        ],
        "systemInstruction": {"parts": [{"text": EXTRACTION_SYSTEM_PROMPT}]},
        "generationConfig": {
            "temperature": 0.1,
            "topP": 0.95,
            "maxOutputTokens": 4096,
        },
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = _requests.post(url, json=payload, timeout=90)

            if resp.status_code == 429:
                wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                print(f"PDF_AGENT: 429 rate-limited (attempt {attempt+1}/{MAX_RETRIES+1}) — retrying in {wait}s...")
                time.sleep(wait)
                continue

            if resp.status_code != 200:
                print(f"PDF_AGENT: Gemini error {resp.status_code}: {resp.text[:300]}")
                return ""

            data = resp.json() or {}
            cands = data.get("candidates") or []
            if not cands:
                print("PDF_AGENT: Gemini returned no candidates")
                return ""

            parts = (cands[0].get("content") or {}).get("parts") or []
            return "\n".join(
                p.get("text", "") for p in parts if isinstance(p.get("text"), str)
            ).strip()

        except Exception as e:
            wait = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
            print(f"PDF_AGENT: Request exception (attempt {attempt+1}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(wait)

    print("PDF_AGENT: All retries exhausted")
    return ""


# ─── Step 3: Parse JSON ───────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict | None:
    """Strip markdown fences and parse JSON."""
    text = raw.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return None


# ─── Main Agent Class ─────────────────────────────────────────────────────────

class PdfExpertAgent:
    """
    Processes a single PDF:
      1. Extract text via pdfplumber.
      2. Send to Gemini as plain text (with retry on 429).
      3. Parse JSON → upsert expert → add to project as Lead.
    """

    def process(self, file_path: str, project_id: int, db, filename: str = None) -> dict:
        fname = filename or os.path.basename(file_path)

        api_key, model = _get_gemini_cfg()
        if not api_key:
            return self._err(fname, "GEMINI_API_KEY not configured")

        # ── Step 1: Extract text ──
        try:
            pdf_text = _extract_pdf_text(file_path)
        except RuntimeError as e:
            return self._err(fname, str(e))

        if not pdf_text.strip():
            return self._err(fname, "Could not extract any text from this PDF (may be image-only/scanned)")

        # ── Step 2: Call Gemini ──
        raw_response = _call_gemini(api_key, model, pdf_text)
        if not raw_response:
            return self._err(fname, "Gemini returned no response — quota may be exhausted, try again later")

        # ── Step 3: Parse JSON ──
        extracted = _parse_json(raw_response)
        if not extracted:
            return self._err(fname, f"Could not parse JSON from Gemini response: {raw_response[:300]}")

        print(f"PDF_AGENT: Parsed data for {fname}: {json.dumps(extracted)[:400]}")

        # ── Step 4: Upsert expert ──
        try:
            return self._upsert_expert(extracted, fname, project_id, db)
        except Exception as e:
            import traceback
            print(f"PDF_AGENT: DB error: {e}")
            print(traceback.format_exc())
            db.session.rollback()
            return self._err(fname, f"DB error: {str(e)}")

    # ─── DB Upsert ────────────────────────────────────────────────────────────

    def _upsert_expert(self, data: dict, filename: str, project_id: int, db) -> dict:
        from models import (
            Expert, ExpertExperience, ExpertStrength,
            LkRegion, LkPrimarySector, LkEmploymentStatus,
            LkSeniority, LkCompanyRole, LkExpertFunction,
            LkSalutation, Project
        )
        from sqlalchemy import func, text

        first_name = (data.get("first_name") or "").strip()
        last_name  = (data.get("last_name") or "").strip()
        email      = (data.get("primary_email") or "").strip().lower() or None
        linkedin   = (data.get("linkedin_url") or "").strip() or None

        if not first_name and not last_name:
            return self._err(filename, "Could not extract expert name from PDF")

        # ── Find existing by email or LinkedIn ──
        existing = None
        if email:
            existing = Expert.query.filter(func.lower(Expert.primary_email) == email).first()
        if not existing and linkedin:
            existing = Expert.query.filter(Expert.linkedin_url == linkedin).first()

        if existing:
            # ── Smart merge: backfill only empty fields ──
            updated_fields = []

            def _bf(attr, val):
                if val and not getattr(existing, attr, None):
                    setattr(existing, attr, val)
                    updated_fields.append(attr)

            _bf("secondary_email",     (data.get("secondary_email") or "").strip() or None)
            _bf("primary_phone",       (data.get("primary_phone") or "").strip() or None)
            _bf("secondary_phone",     (data.get("secondary_phone") or "").strip() or None)
            _bf("linkedin_url",        linkedin)
            _bf("title_headline",      (data.get("title_headline") or "").strip() or None)
            _bf("bio",                 (data.get("bio") or "").strip() or None)
            _bf("years_of_experience", data.get("years_of_experience"))

            # Education
            edu = data.get("education") or []
            if edu and not (existing.education or []):
                existing.education = edu
                updated_fields.append("education")

            # Employment history
            emp_hist = data.get("employment_history") or []
            if emp_hist and not existing.experiences:
                for job in emp_hist:
                    db.session.add(ExpertExperience(
                        expert_id=existing.id,
                        company_name=(job.get("company") or "Unknown")[:255],
                        role_title=(job.get("role") or "Professional")[:255],
                        start_year=_safe_year(job.get("start_year")),
                        end_year=_safe_year(job.get("end_year")),
                    ))
                updated_fields.append("employment_history")

            # Strength topics
            topics_raw = data.get("strength_topics") or ""
            if topics_raw and not existing.strengths:
                for t in [x.strip() for x in topics_raw.split(",") if x.strip()]:
                    db.session.add(ExpertStrength(expert_id=existing.id, topic_name=t[:255]))
                updated_fields.append("strength_topics")

            # Lookup backfills
            self._bf_lookup(existing, "region_id",                    LkRegion,           data.get("region"),                    updated_fields)
            self._bf_lookup(existing, "seniority_id",                 LkSeniority,        data.get("seniority"),                 updated_fields)
            self._bf_lookup(existing, "current_employment_status_id", LkEmploymentStatus, data.get("current_employment_status"), updated_fields, create=False)
            self._bf_lookup(existing, "primary_sector_id",            LkPrimarySector,    data.get("primary_sector"),            updated_fields, db=db)
            self._bf_lookup(existing, "expert_function_id",           LkExpertFunction,   data.get("expert_function"),           updated_fields, db=db)

            expert      = existing
            status_verb = "updated" if updated_fields else "duplicate"
            msg         = f"Expert already exists — backfilled: {', '.join(updated_fields) or 'none'}."

        else:
            # ── Create new expert ──
            res = db.session.execute(text(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(expert_id FROM '\\d+$') AS INTEGER)), 0) "
                "FROM experts WHERE expert_id ~ '^EX-\\d+$'"
            ))
            max_num = (res.scalar() or 0) + 1
            while True:
                eid = f"EX-{max_num:05d}"
                if not Expert.query.filter_by(expert_id=eid).first():
                    break
                max_num += 1

            expert = Expert(
                expert_id=eid,
                first_name=first_name or "Unknown",
                last_name=last_name or "",
                primary_email=email,
                secondary_email=(data.get("secondary_email") or "").strip() or None,
                primary_phone=(data.get("primary_phone") or "").strip() or None,
                secondary_phone=(data.get("secondary_phone") or "").strip() or None,
                linkedin_url=linkedin,
                title_headline=(data.get("title_headline") or "").strip()[:500] or None,
                bio=(data.get("bio") or "").strip() or None,
                years_of_experience=data.get("years_of_experience"),
                education=data.get("education") or [],
            )
            db.session.add(expert)
            db.session.flush()

            def _resolve(model, val):
                if not val: return None
                row = model.query.filter(model.name.ilike(str(val).strip())).first()
                return row.id if row else None

            def _resolve_or_create(model, val, max_len=100):
                if not val: return None
                n = str(val).strip()[:max_len]
                row = model.query.filter(model.name.ilike(n)).first()
                if not row:
                    row = model(name=n)
                    db.session.add(row)
                    db.session.flush()
                return row.id

            expert.region_id                    = _resolve(LkRegion,           data.get("region"))
            expert.seniority_id                 = _resolve(LkSeniority,        data.get("seniority"))
            expert.current_employment_status_id = _resolve(LkEmploymentStatus, data.get("current_employment_status"))
            expert.primary_sector_id            = _resolve_or_create(LkPrimarySector,  data.get("primary_sector"))
            expert.expert_function_id           = _resolve_or_create(LkExpertFunction, data.get("expert_function"))
            expert.company_role_id              = _resolve_or_create(LkCompanyRole,    data.get("company_role"))

            sal_raw = (data.get("salutation") or "").strip()
            if sal_raw:
                sal = LkSalutation.query.filter(LkSalutation.name.ilike(sal_raw)).first()
                if sal:
                    expert.salutation_id = sal.id

            for job in (data.get("employment_history") or []):
                db.session.add(ExpertExperience(
                    expert_id=expert.id,
                    company_name=(job.get("company") or "Unknown")[:255],
                    role_title=(job.get("role") or "Professional")[:255],
                    start_year=_safe_year(job.get("start_year")),
                    end_year=_safe_year(job.get("end_year")),
                ))

            for t in [x.strip() for x in (data.get("strength_topics") or "").split(",") if x.strip()]:
                db.session.add(ExpertStrength(expert_id=expert.id, topic_name=t[:255]))

            msg         = f"Expert {eid} created from PDF."
            status_verb = "created"

        # ── Add to project as Lead ──
        project = Project.query.get(project_id)
        if project:
            leads = list(project.leads_expert_ids or [])
            if expert.id not in leads:
                leads.append(expert.id)
                project.leads_expert_ids = leads

        db.session.commit()

        return {
            "status":    status_verb,
            "expert_id": expert.expert_id,
            "name":      f"{expert.first_name} {expert.last_name}".strip(),
            "message":   msg,
            "filename":  filename,
        }

    def _bf_lookup(self, expert, attr, model, val, updated_fields, create=True, db=None):
        """Backfill a FK lookup field only if it is currently empty."""
        if not val or getattr(expert, attr, None):
            return
        row = model.query.filter(model.name.ilike(str(val).strip())).first()
        if not row and create and db:
            row = model(name=str(val).strip()[:100])
            db.session.add(row)
            db.session.flush()
        if row:
            setattr(expert, attr, row.id)
            updated_fields.append(attr.replace("_id", ""))

    @staticmethod
    def _err(filename, message):
        print(f"PDF_AGENT ERROR [{filename}]: {message}")
        return {
            "status":    "error",
            "expert_id": None,
            "name":      None,
            "message":   message,
            "filename":  filename,
        }


# ─── Utility ──────────────────────────────────────────────────────────────────

def _safe_year(val):
    """Safely convert a year value to int within a valid range."""
    if val is None:
        return None
    try:
        y = int(val)
        return y if 1900 <= y <= 2100 else None
    except (ValueError, TypeError):
        return None
