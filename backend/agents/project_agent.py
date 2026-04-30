"""
project_agent.py  (v2 — Hasamex SAM Edition)
=============================================
Conversational agent that guides the user through creating a new project record.

Key Enhancements (v2):
  • Full Hasamex SAM system prompt drives deep email analysis (project scoping,
    value-chain context, IEPs, outreach copy, compliance notes).
  • If target companies / geographies are NOT in the email, the LLM suggests
    them based on sector / region inference.
  • User can mix email content with extra context / focus instructions in the
    same message (e.g. "Here is the email … also compare project questions").
  • In any post-email phase, natural-language questions (not edits) are answered
    using the stored analysis context instead of routing to the edit flow.

State is persisted in ChatMessage.content_json on a 'system' role message.

Phases:
  idle / None  → initial trigger
  awaiting_email  → asked user to share email + optional focus
  collecting      → sequential wizard for missing structured fields
  awaiting_analyst  → inline dropdown for Research Analyst(s)
  awaiting_manager  → inline dropdown for Account Manager(s)
  review          → summary table + approve button + free-form Q&A
  done            → project committed to DB
"""

import json
import re

from .provider_config import get_llm_provider, get_gemini_model, get_gemini_api_key
from .gemini_client import generate as gemini_generate

# ─────────────────────────────────────────────────────────────────────────────
# Hasamex SAM system prompt (embedded)
# ─────────────────────────────────────────────────────────────────────────────
SAM_SYSTEM_PROMPT = """
Role: Assist Hasamex human analysts with project scoping, preparation, expert recruiting copy, and client-ready expert delivery packages — to best-in-class, consistent standards.

GENERAL RULES:
- Clearly distinguish between facts from the client brief and hypotheses. Mark hypotheses as: (Hypothesis: …).
- Keep outputs concise, professional, and plain-language.
- Maintain Hasamex's compliance positioning in all outputs.
- Always tailor value chain, IEPs, and messaging based on client type (PE, Hedge Fund, Consulting, Corporate, etc.).
- All examples, news context, and company names should be relevant to the project region and sector.
- Avoid jargon; if specialist terms are needed, define them.

TASK 1: PROJECT SCOPING & PREPARATION
Sub-task 1 – Analyst Briefing: Value Chain & Context
  Sections:
  1. Project Objective (from brief; use Hypothesis if not explicit)
  2. Decision Type & Horizon (pre-investment DD, market entry, competitor landscaping, etc.)
  3. Value Chain Overview (stages, role, 1-2 example companies per stage)
  4. Market Context & Recent News (size, growth drivers, HQ locations, "Why Now?" section)
  5. Key Themes for Analyst Awareness
  6. Ideal Expert Profiles (IEPs):
     - Primary IEPs (titles, company types, current/former, MNPI risk)
     - Secondary & Tertiary IEPs
     - Confidence interval per IEP
     - Optional additional angle for upselling
  7. Service Protocol Reminder: deliver minimum 3 vetted experts within 3 hours
  8. Glossary of Terms

Sub-task 2 – Project Scoping for Expert Invite Form
  - Project Description: 1 paragraph, clear, jargon-free
    Format: "An analyst at a [Client Type] firm based in [City] is conducting research on the [Sector] sector to understand [Topics] — focusing on companies such as [Company A], [Company B], and peers. The objective is to learn about [general aim]. They are particularly looking to understand: [Topic 1], [Topic 2], [Topic 3]. The consultation will be a 45–60 min MS Teams call for internal research/decision-making only. Compliance Note: No MNPI may be shared. Experts must rely on personal experience and public information."
  - Profile Questions (PQs):
    - Provide at least 3 and up to 6-10 specific open-ended questions based on the research topics.
    - Format: 
      1. Are you able to [open-ended question]? Please share experience.
      2. Can you speak on [open-ended question]? Please share experience.
      ...
    - Include: On a scale of 1–10, how confident are you on the above topics?

Sub-task 3 – Expert Recruiting Outreach Messaging Pack (GENERATE ONLY WHEN REQUESTED AFTER PROJECT CREATION)
  - LinkedIn InMail (<80 words)
  - LinkedIn Connection Request (<40 words)
  - Email (<120 words)
  - SMS/WhatsApp (<80 words)
  Guidelines:
    - FILL IN all project-specific details (Sector, Client Type, Region, general aim, Target Titles) using actual data from the provided project fields.
    - NEVER use generic or descriptive placeholders like [Sector], [Client Type, e.g. Consulting], or [Topics].
    - USE ONLY these 3 specific placeholders for expert-level variables: [Expert Name], [Company Name], [Link to Form].
    - Mention Hasamex positioning, compliance, and invite to receive form link.

TASK 2: CLIENT DELIVERY PACKAGE (GENERATE ONLY AFTER EXPERT INTERACTION)
  - Email body to client
  - Individual Expert Profile sections
""".strip()

# ─────────────────────────────────────────────────────────────────────────────
# Sequential fields wizard
# ─────────────────────────────────────────────────────────────────────────────
SEQUENTIAL_FIELDS = [
    {
        "key": "client_name_raw",
        "display": "Client Name",
        "type": "client_dropdown",
    },
    {
        "key": "poc_user_name_raw",
        "display": "User Name (PoC)",
        "type": "poc_dropdown",
    },
    {
        "key": "received_date",
        "display": "Received Date",
        "prompt": "What is the **received date** for this project? (format: YYYY-MM-DD)",
        "type": "date",
    },
    {
        "key": "project_deadline",
        "display": "Project Deadline",
        "prompt": "What is the **project deadline**? (format: YYYY-MM-DD)",
        "type": "date",
    },
    {
        "key": "project_type",
        "display": "Project Type",
        "prompt": (
            "What is the **project type**? Reply with one of:\n"
            "• **Current** — only current employees\n"
            "• **Former** — only former employees\n"
            "• **Both** — current and former employees"
        ),
        "type": "choice",
        "choices": ["Current", "Former", "Both"],
    },
    {
        "key": "number_of_calls",
        "display": "Number of Calls (total)",
        "prompt": "How many **total calls** are expected for this project?",
        "type": "number",
    },
    {
        "key": "scheduled_calls_count",
        "display": "Calls Scheduled (S)",
        "prompt": "How many calls are currently **scheduled (S)**? (Enter 0 if none yet)",
        "type": "number",
    },
    {
        "key": "completed_calls_count",
        "display": "Calls Completed (C)",
        "prompt": "How many calls have been **completed (C)**? (Enter 0 if none yet)",
        "type": "number",
    },
    {
        "key": "goal_calls_count",
        "display": "Goal Calls (G)",
        "prompt": "What is the **goal number of calls (G)** for this project?",
        "type": "number",
    },
]

AUTO_EXTRACT_FIELDS = [
    "project_title", "project_description", "project_questions",
    "compliance_question_1", "target_companies", "target_functions_titles",
    "target_functions", "target_region", "target_geographies", "current_former_both",
]

# Analysis question detection keywords
ANALYSIS_KEYWORDS = [
    "compare", "explain", "what is", "why", "how does", "summarize", "summarise",
    "give me", "list", "describe", "analyse", "analyze", "tell me", "what are",
    "show me", "elaborate", "suggest", "recommend", "draft", "generate", "write",
    "create outreach", "write email", "write inmail", "recruiting copy", "iep",
    "value chain", "market context", "why now", "expert profile", "outreach",
    "project description", "profile question", "pq", "compliance note",
]


def _is_empty(v):
    return v is None or v == "" or v == []


class ProjectAgent:
    INTENT_KEYWORDS = [
        "create project", "new project", "add project", "start a project",
        "create a new project", "make a project", "setup project",
    ]

    def __init__(self):
        self.provider = get_llm_provider()
        self.model = get_gemini_model()
        self.api_key = get_gemini_api_key()

    # ─────────────────────────────────────────────────────────────────────────
    # Public entry point
    # ─────────────────────────────────────────────────────────────────────────
    def handle(self, state: dict, user_text: str, db) -> tuple[str, dict]:
        phase = state.get("project_mode", "idle")

        if phase in ("idle", None):
            return self._start(state, db)

        if phase == "awaiting_email":
            return self._process_email(state, user_text, db)

        if phase == "collecting":
            return self._process_sequential(state, user_text, db)

        if phase == "awaiting_analyst":
            return self._process_analyst(state, user_text, db)

        if phase == "awaiting_manager":
            return self._process_manager(state, user_text, db)

        if phase == "review":
            return self._process_review(state, user_text, db)

        if phase == "done":
            # Allow follow-up analysis questions even after creation
            if self._is_analysis_query(user_text):
                return self._answer_analysis_query(state, user_text)
            return (
                "The project was already created! "
                "You can ask me anything about it or type **create project** to start a new one.",
                state,
            )

        return (
            "Something went wrong — type **create project** to begin again.",
            {"project_mode": None},
        )

    @classmethod
    def is_project_intent(cls, text: str) -> bool:
        t = text.lower().strip()
        return any(kw in t for kw in cls.INTENT_KEYWORDS)

    # ─────────────────────────────────────────────────────────────────────────
    # Phase: start
    # ─────────────────────────────────────────────────────────────────────────
    def _start(self, state: dict, db) -> tuple[str, dict]:
        lookups = self._load_lookups(db)
        new_state = {
            "project_mode": "awaiting_email",
            "fields": self._empty_fields(),
            "current_field": None,
            "lookups": lookups,
            "email_context": None,      # raw email text stored for Q&A
            "sam_analysis": None,       # full SAM analysis markdown
        }
        reply = (
            "🚀 **Let's create a new project!**\n\n"
            "Please share the **project requirements or client email content** below.\n\n"
            "I'll run a full project scope analysis (value chain, ideal expert profiles, "
            "outreach copy) **and** auto-extract all form fields.\n\n"
            "_You can also add extra focus instructions alongside the email — e.g._\n"
            "_\"Here is the email … also generate LinkedIn InMail copy for this.\"_"
        )
        return reply, new_state

    # ─────────────────────────────────────────────────────────────────────────
    # Phase: process email
    # ─────────────────────────────────────────────────────────────────────────
    def _process_email(self, state: dict, raw_message: str, db) -> tuple[str, dict]:
        """
        Splits user message into (email_text, focus_instruction).
        Runs SAM analysis + field extraction + smart suggestions.
        """
        email_text, focus_instruction = self._split_email_and_context(raw_message)

        state["email_context"] = email_text

        # 1. Run SAM deep analysis
        sam_analysis = self._run_sam_analysis(email_text, focus_instruction)
        state["sam_analysis"] = sam_analysis

        # 2. Extract + suggest structured fields
        extracted = self._extract_with_suggestions(email_text)
        fields = state.get("fields", self._empty_fields())
        for k, v in extracted.items():
            if not _is_empty(v) and _is_empty(fields.get(k)):
                fields[k] = v
        state["fields"] = fields

        # 3. Build extraction summary
        extracted_lines = []
        for k in AUTO_EXTRACT_FIELDS:
            v = fields.get(k)
            if not _is_empty(v):
                if isinstance(v, list):
                    val_str = ", ".join(str(x) for x in v[:4]) + ("…" if len(v) > 4 else "")
                else:
                    val_str = str(v)[:100] + ("…" if len(str(v)) > 100 else "")
                extracted_lines.append(f"• **{k.replace('_', ' ').title()}**: {val_str}")

        extraction_block = (
            "\n".join(extracted_lines)
            if extracted_lines
            else "_No fields auto-extracted. I'll collect them step by step._"
        )

        # 4. Format the analysis block with a directive to toggle it
        analysis_directive = json.dumps({
            "type": "analysis_block",
            "title": "📊 SAM Project Analysis",
            "content": sam_analysis,
        })

        reply_parts = [
            "✅ **Email analysed!** Here's what I extracted:\n",
            extraction_block,
            "",
            f"<!-- DIRECTIVE:{analysis_directive} -->",
            "",
            "_The full SAM analysis (value chain, IEPs, outreach copy) is shown above._\n"
        ]

        if focus_instruction:
            focus_answer = self._answer_focus_instruction(email_text, focus_instruction, sam_analysis)
            reply_parts += [
                f"---\n💬 **Your additional request:** _{focus_instruction}_\n",
                focus_answer,
                "",
            ]

        reply_parts.append("\nNow let me collect the remaining project details…")

        state["project_mode"] = "collecting"
        state["current_field"] = None

        combined_reply = "\n".join(reply_parts)
        return self._next_sequential_question(state, [combined_reply], db)

    # ─────────────────────────────────────────────────────────────────────────
    # Phase: sequential collection
    # ─────────────────────────────────────────────────────────────────────────
    def _process_sequential(self, state: dict, user_text: str, db) -> tuple[str, dict]:
        # Detect if user is asking a question instead of answering a field
        current_key = state.get("current_field")
        if self._is_analysis_query(user_text) and not self._looks_like_field_answer(current_key, user_text):
            answer = self._answer_analysis_query(state, user_text)
            # Re-ask the current field
            re_ask = self._re_ask_current_field(state)
            return f"{answer[0]}\n\n---\n{re_ask}", state

        fields = state.get("fields", self._empty_fields())

        if current_key:
            field_def = next((fd for fd in SEQUENTIAL_FIELDS if fd["key"] == current_key), None)
            if field_def:
                ftype = field_def.get("type", "text")

                if ftype == "client_dropdown":
                    lookups = state.get("lookups", {})
                    clients = lookups.get("clients", [])
                    match = next(
                        (c for c in clients if c["client_name"].lower() == user_text.strip().lower()),
                        None,
                    )
                    fields["client_name_raw"] = user_text.strip()
                    if match:
                        fields["client_id"] = match["client_id"]

                elif ftype == "poc_dropdown":
                    lookups = state.get("lookups", {})
                    users = lookups.get("users", [])
                    match = next(
                        (u for u in users if (u.get("user_name") or "").lower() == user_text.strip().lower()),
                        None,
                    )
                    fields["poc_user_name_raw"] = user_text.strip()
                    if match:
                        fields["poc_user_id"] = match["user_id"]

                else:
                    fields[current_key] = self._parse_answer(field_def, user_text.strip())

        state["fields"] = fields
        state["current_field"] = None
        return self._next_sequential_question(state, [], db)

    def _next_sequential_question(self, state: dict, prefix_lines: list, db) -> tuple[str, dict]:
        fields = state.get("fields", self._empty_fields())
        lookups = state.get("lookups", {})
        pending = self._get_pending_fields(fields)

        if not pending:
            return self._ask_analyst(state, prefix_lines, db)

        field_def = pending[0]
        key = field_def["key"]
        ftype = field_def.get("type", "text")

        state["current_field"] = key
        state["project_mode"] = "collecting"

        lines = list(prefix_lines)

        if ftype == "client_dropdown":
            clients = lookups.get("clients", [])
            directive = json.dumps({
                "type": "dropdown",
                "field": "client",
                "label": "Select Client",
                "multi": False,
                "options": [c["client_name"] for c in clients],
            })
            lines.append(
                f"\n**{field_def['display']}**\n"
                "Please select the client from the searchable dropdown below:"
            )
            lines.append(f"<!-- DIRECTIVE:{directive} -->")

        elif ftype == "poc_dropdown":
            users = lookups.get("users", [])
            client_id = fields.get("client_id")
            filtered = [u for u in users if str(u.get("client_id", "")) == str(client_id)] if client_id else users
            directive = json.dumps({
                "type": "dropdown",
                "field": "poc_user",
                "label": "Select Point of Contact (PoC)",
                "multi": False,
                "options": [u["user_name"] for u in filtered],
            })
            lines.append(
                f"\n**{field_def['display']}**\n"
                "Please select the PoC user from the searchable dropdown below:"
            )
            lines.append(f"<!-- DIRECTIVE:{directive} -->")

        else:
            lines.append(f"\n**{field_def['display']}**\n{field_def['prompt']}")

        return "\n".join(lines), state

    def _get_pending_fields(self, fields: dict) -> list:
        return [fd for fd in SEQUENTIAL_FIELDS if _is_empty(fields.get(fd["key"]))]

    def _re_ask_current_field(self, state: dict) -> str:
        """Return the prompt text for the currently pending field (for re-asking after Q&A)."""
        fields = state.get("fields", self._empty_fields())
        current_key = state.get("current_field")
        if current_key:
            fd = next((f for f in SEQUENTIAL_FIELDS if f["key"] == current_key), None)
            if fd:
                return f"_(Back to field collection) — **{fd['display']}**: {fd.get('prompt', 'Please provide a value.')}_ "
        pending = self._get_pending_fields(fields)
        if pending:
            return f"_(Back to field collection) — **{pending[0]['display']}**: {pending[0].get('prompt', 'Please provide a value.')}_"
        return ""

    # ─────────────────────────────────────────────────────────────────────────
    # Phase: analyst dropdown
    # ─────────────────────────────────────────────────────────────────────────
    def _ask_analyst(self, state: dict, prefix_lines: list, db) -> tuple[str, dict]:
        lookups = state.get("lookups", {})
        names = [u["name"] for u in lookups.get("hasamex_users", [])]
        state["project_mode"] = "awaiting_analyst"
        directive = json.dumps({
            "type": "dropdown",
            "field": "analyst",
            "label": "Select Research Analyst(s)",
            "multi": True,
            "options": names,
        })
        lines = list(prefix_lines)
        lines.append(
            "\n\n👤 **Research Analyst**\n"
            "Please select the Research Analyst(s) from the searchable dropdown below:"
        )
        lines.append(f"<!-- DIRECTIVE:{directive} -->")
        return "\n".join(lines), state

    def _process_analyst(self, state: dict, user_text: str, db) -> tuple[str, dict]:
        hasamex_users = state.get("lookups", {}).get("hasamex_users", [])
        name_to_id = {u["name"]: u["id"] for u in hasamex_users}
        selected = [n.strip() for n in user_text.split(",") if n.strip()]
        state["fields"]["client_solution_owner_ids"] = [str(name_to_id[n]) for n in selected if n in name_to_id]
        return self._ask_manager(state, db)

    # ─────────────────────────────────────────────────────────────────────────
    # Phase: manager dropdown
    # ─────────────────────────────────────────────────────────────────────────
    def _ask_manager(self, state: dict, db) -> tuple[str, dict]:
        lookups = state.get("lookups", {})
        names = [u["name"] for u in lookups.get("hasamex_users", [])]
        state["project_mode"] = "awaiting_manager"
        directive = json.dumps({
            "type": "dropdown",
            "field": "manager",
            "label": "Select Account Manager(s)",
            "multi": True,
            "options": names,
        })
        return (
            "👤 **Account Manager**\n"
            "Please select the Account Manager(s) from the searchable dropdown below:\n"
            f"<!-- DIRECTIVE:{directive} -->"
        ), state

    def _process_manager(self, state: dict, user_text: str, db) -> tuple[str, dict]:
        hasamex_users = state.get("lookups", {}).get("hasamex_users", [])
        name_to_id = {u["name"]: u["id"] for u in hasamex_users}
        selected = [n.strip() for n in user_text.split(",") if n.strip()]
        state["fields"]["sales_team_ids"] = [str(name_to_id[n]) for n in selected if n in name_to_id]
        state["project_mode"] = "review"
        return self._build_summary(state)

    # ─────────────────────────────────────────────────────────────────────────
    # Phase: review
    # ─────────────────────────────────────────────────────────────────────────
    def _build_summary(self, state: dict) -> tuple[str, dict]:
        fields = state.get("fields", {})
        lookups = state.get("lookups", {})
        id_to_name = {str(u["id"]): u["name"] for u in lookups.get("hasamex_users", [])}
        id_to_client = {str(c["client_id"]): c["client_name"] for c in lookups.get("clients", [])}
        id_to_user = {str(u["user_id"]): u["user_name"] for u in lookups.get("users", [])}

        def _val(k, default="—"):
            v = fields.get(k)
            if _is_empty(v):
                return default
            if isinstance(v, list):
                return ", ".join(str(x) for x in v) if v else default
            return str(v)

        analyst_names = ", ".join(id_to_name.get(str(i), str(i)) for i in (fields.get("client_solution_owner_ids") or [])) or "—"
        manager_names = ", ".join(id_to_name.get(str(i), str(i)) for i in (fields.get("sales_team_ids") or [])) or "—"
        client_name = fields.get("client_name_raw") or id_to_client.get(str(fields.get("client_id")), "—")
        poc_name = fields.get("poc_user_name_raw") or id_to_user.get(str(fields.get("poc_user_id")), "—")
        questions = fields.get("project_questions") or []
        questions_str = "\n".join(f"  {i+1}. {q}" for i, q in enumerate(questions)) if questions else "  —"

        summary = f"""📋 **Project Summary — Please Review**

| Field | Value |
|-------|-------|
| **Title** | {_val('project_title')} |
| **Client** | {client_name} |
| **PoC User** | {poc_name} |
| **Received Date** | {_val('received_date')} |
| **Deadline** | {_val('project_deadline')} |
| **Project Type** | {_val('project_type', _val('current_former_both'))} |
| **Region** | {_val('target_region')} |
| **Geographies** | {_val('target_geographies')} |
| **Target Companies** | {_val('target_companies')} |
| **Research Analyst** | {analyst_names} |
| **Account Manager** | {manager_names} |
| **Calls (Total/S/C/G)** | {_val('number_of_calls', '—')} / {_val('scheduled_calls_count', '0')} / {_val('completed_calls_count', '0')} / {_val('goal_calls_count', '—')} |

**Description:**
{_val('project_description')}

**Target Titles:** {_val('target_functions_titles')}
**Target Functions:** {_val('target_functions')}

**Project Questions:**
{questions_str}

**Compliance Question:** {_val('compliance_question_1')}

---
💬 **You can:**
- Edit any field: _"Change deadline to 2026-06-01"_
- Ask analysis questions: _"Generate LinkedIn InMail copy"_ / _"Compare these project questions"_
- Click **Approve** to create the project

<!-- DIRECTIVE:{{"type":"approve_button"}} -->"""

        return summary, state

    def _process_review(self, state: dict, user_text: str, db) -> tuple[str, dict]:
        text_lower = user_text.strip().lower()
        if text_lower in ("approve", "create", "confirm", "yes", "submit", "__approve__"):
            return self._create_project(state, db)

        # Check if it's an analysis question (not a field edit)
        if self._is_analysis_query(user_text):
            answer_text, _ = self._answer_analysis_query(state, user_text)
            return answer_text, state

        # Otherwise treat as field edit
        fields = state.get("fields", {})
        updated_fields, edit_summary = self._apply_edit(fields, user_text)
        state["fields"] = updated_fields
        summary, state = self._build_summary(state)
        return f"✅ {edit_summary}\n\nHere's the updated summary:\n\n{summary}", state

    # ─────────────────────────────────────────────────────────────────────────
    # Phase: create project
    # ─────────────────────────────────────────────────────────────────────────
    def _create_project(self, state: dict, db) -> tuple[str, dict]:
        from models import Project, LkProjectType, LkRegion, LkProjectTargetGeography, OutreachMessage
        from datetime import date

        fields = state.get("fields", {})
        lookups = state.get("lookups", {})

        def parse_date(val):
            if not val:
                return None
            if isinstance(val, date):
                return val
            try:
                return date.fromisoformat(str(val))
            except Exception:
                return None

        def safe_int(val):
            try:
                return int(val) if not _is_empty(val) else None
            except Exception:
                return None

        def csv_from_list(val):
            if not val:
                return None
            if isinstance(val, list):
                return ",".join(str(x) for x in val if str(x).strip())
            return str(val)

        client_id = safe_int(fields.get("client_id"))
        if not client_id:
            name_raw = str(fields.get("client_name_raw", "")).strip().lower()
            for c in lookups.get("clients", []):
                if c["client_name"].lower() == name_raw:
                    client_id = c["client_id"]
                    break

        poc_user_id = safe_int(fields.get("poc_user_id"))
        if not poc_user_id:
            poc_raw = str(fields.get("poc_user_name_raw", "")).strip().lower()
            for u in lookups.get("users", []):
                if (u.get("user_name") or "").lower() == poc_raw:
                    poc_user_id = u["user_id"]
                    break

        if not client_id:
            return (
                "⚠️ Could not find the **client** in the database. "
                "Please check the client name and try again.",
                state,
            )

        pt_name = fields.get("project_type") or fields.get("current_former_both")
        project_type_id = None
        if pt_name:
            pt = LkProjectType.query.filter(LkProjectType.name.ilike(pt_name)).first()
            project_type_id = pt.id if pt else None

        tr_name = fields.get("target_region")
        target_region_id = None
        if tr_name:
            tr = LkRegion.query.filter(LkRegion.name.ilike(tr_name)).first()
            target_region_id = tr.id if tr else None

        geo_names = fields.get("target_geographies") or []
        if isinstance(geo_names, str):
            geo_names = [g.strip() for g in geo_names.split(",") if g.strip()]
        geos = []
        if geo_names:
            geos = LkProjectTargetGeography.query.filter(
                LkProjectTargetGeography.name.in_(geo_names)
            ).all()

        questions = fields.get("project_questions") or []
        if isinstance(questions, str):
            questions = [q.strip() for q in questions.split("\n") if q.strip()]

        new_project = Project(
            client_id=client_id,
            poc_user_ids=[poc_user_id] if poc_user_id else [],
            received_date=parse_date(fields.get("received_date")),
            project_title=fields.get("project_title"),
            title=fields.get("project_title") or "Untitled Project",
            project_type_id=project_type_id,
            project_description=fields.get("project_description"),
            target_companies=fields.get("target_companies") or [],
            target_region_id=target_region_id,
            target_functions_titles=fields.get("target_functions_titles"),
            target_functions=fields.get("target_functions") or [],
            current_former_both=fields.get("current_former_both") or fields.get("project_type") or "Both",
            number_of_calls=safe_int(fields.get("number_of_calls")),
            scheduled_calls_count=safe_int(fields.get("scheduled_calls_count")) or 0,
            completed_calls_count=safe_int(fields.get("completed_calls_count")) or 0,
            goal_calls_count=safe_int(fields.get("goal_calls_count")),
            project_questions=questions,
            compliance_question_1=fields.get("compliance_question_1"),
            project_deadline=parse_date(fields.get("project_deadline")),
            status="Planning",
            client_solution_owner_ids=csv_from_list(fields.get("client_solution_owner_ids") or []),
            sales_team_ids=csv_from_list(fields.get("sales_team_ids") or []),
        )
        if geos:
            new_project.target_geographies = geos

        db.session.add(new_project)
        db.session.commit()

        state["project_mode"] = "done"
        state["created_project_id"] = new_project.project_id

        # Generate Outreach Messaging Pack after approval
        outreach_pack = self._generate_outreach_pack(state.get("email_context", ""), fields)
        outreach_directive = json.dumps({
            "type": "analysis_block",
            "title": "📩 Outreach Messaging Pack",
            "content": outreach_pack,
        })

        reply = (
            f"🎉 **Project created successfully!**\n\n"
            f"**{new_project.project_title or new_project.title}** has been saved "
            f"with ID `{new_project.project_id}`.\n\n"
            f"I have also generated the **Expert Recruiting Outreach Messaging Pack** for you below.\n\n"
            f"<!-- DIRECTIVE:{outreach_directive} -->\n\n"
            f'<!-- DIRECTIVE:{{"type":"project_link","project_id":{new_project.project_id}}} -->'
        )

        # Save Outreach Messages to DB
        parsed = self._parse_outreach_pack(outreach_pack)
        outreach_msg_row = OutreachMessage(
            project_id=new_project.project_id,
            email_content=parsed.get("email"),
            linkedin_content=parsed.get("linkedin_connection"),
            whatsapp_sms_content=parsed.get("whatsapp_sms"),
            linkedin_inmail_content=parsed.get("linkedin_inmail"),
        )
        db.session.add(outreach_msg_row)
        db.session.commit()

        return reply, state

    def _parse_outreach_pack(self, raw_pack: str) -> dict:
        """
        Parses the raw SAM outreach pack text into a dictionary of:
        { email, linkedin_inmail, linkedin_connection, whatsapp_sms }
        Excludes the titles/headers from the extracted content.
        """
        out = {
            "email": None,
            "linkedin_inmail": None,
            "linkedin_connection": None,
            "whatsapp_sms": None,
        }
        
        # Regex to find sections:
        # 1. Matches a common header pattern (digits, dots, stars, hashes)
        # 2. Captures the header text (to identify the type)
        # 3. Captures everything following it until the next header or end
        pattern = r"(?i)(?:^|\n)(?:-|\*|###|\d+\.|\*\*)+\s*(.*?)\s*\n([\s\S]*?)(?=\n(?:-|\*|###|\d+\.|\*\*)|$)"
        matches = re.finditer(pattern, raw_pack)
        
        found_any = False
        for match in matches:
            header = match.group(1).lower()
            content = match.group(2).strip()
            if not content: continue
            
            # Map headers to keys
            if "inmail" in header:
                out["linkedin_inmail"] = content
                found_any = True
            elif "connection" in header or "request" in header:
                out["linkedin_connection"] = content
                found_any = True
            elif "email" in header:
                out["email"] = content
                found_any = True
            elif "whatsapp" in header or "sms" in header:
                out["whatsapp_sms"] = content
                found_any = True
        
        # Fallback: if the sophisticated regex found nothing, try the old split method
        # but try to strip the first line if it looks like a header
        if not found_any:
            sections = re.split(r"(?i)\n(?:-|\*|###|\d+\.|\*\*)\s*", "\n" + raw_pack)
            for sec in sections:
                lines = sec.strip().split('\n', 1)
                if len(lines) < 2: continue
                
                header = lines[0].lower()
                content = lines[1].strip()
                
                if "inmail" in header:
                    out["linkedin_inmail"] = content
                elif "connection" in header or "request" in header:
                    out["linkedin_connection"] = content
                elif "email" in header:
                    out["email"] = content
                elif "whatsapp" in header or "sms" in header:
                    out["whatsapp_sms"] = content

        return out

    # ─────────────────────────────────────────────────────────────────────────
    # LLM helpers
    # ─────────────────────────────────────────────────────────────────────────
    def _run_sam_analysis(self, email_text: str, focus_instruction: str = "") -> str:
        """Run the full Hasamex SAM analysis for INITIAL scoping only."""
        user_prompt = (
            f"Project Brief / Client Email:\n\n{email_text}\n\n"
            "INSTRUCTIONS:\n"
            "1. Focus ONLY on Analyst Briefing (Value Chain/Context) and Expert Invite Form Scoping (Description/PQs).\n"
            "2. DO NOT generate the Expert Recruiting Outreach Messaging Pack (LinkedIn/Email templates) yet.\n"
        )
        if focus_instruction:
            user_prompt += f"\n3. Additional Analyst Request: {focus_instruction}"

        raw = gemini_generate(
            self.api_key,
            self.model,
            SAM_SYSTEM_PROMPT,
            user_prompt,
            temperature=0.4,
            max_output_tokens=6000,
        )
        return raw.strip() if raw else "_Analysis unavailable._"

    def _generate_outreach_pack(self, email_text: str, fields: dict) -> str:
        """Generate common outreach templates after project creation."""
        fields_json = json.dumps(fields, indent=2)
        user_prompt = (
            f"Project Details:\n{fields_json}\n\n"
            f"Original Brief:\n{email_text}\n\n"
            "INSTRUCTIONS: Based on the above, please produce the 'Expert Recruiting Outreach Messaging Pack' (Sub-task 3 from your core SAM instructions). "
            "Generate tailored, concise templates for LinkedIn InMail, Connection Request, Email, and SMS/WhatsApp."
        )
        raw = gemini_generate(
            self.api_key,
            self.model,
            SAM_SYSTEM_PROMPT,
            user_prompt,
            temperature=0.4,
            max_output_tokens=4096,
        )
        return raw.strip() if raw else "_Outreach templates could not be generated._"

    def _extract_with_suggestions(self, email_text: str) -> dict:
        """
        Extract structured fields from the email.
        If target_companies or target_geographies are missing, suggest them
        based on sector / region inference.
        """
        system = (
            "You are a data extraction assistant for a project management platform. "
            "Extract structured fields from the client email/brief and return ONLY valid JSON.\n\n"
            "Keys to extract (omit if not found):\n"
            "  project_title, project_description, project_questions (array of strings),\n"
            "  compliance_question_1, target_companies (array of company names),\n"
            "  target_functions_titles (string), target_functions (array),\n"
            "  target_region (string), target_geographies (array of country/region names),\n"
            "  current_former_both (one of: Current, Former, Both),\n"
            "  received_date (YYYY-MM-DD), project_deadline (YYYY-MM-DD),\n"
            "  number_of_calls (integer), goal_calls_count (integer).\n\n"
            "RULES:\n"
            "1. target_region: MUST be one of: APAC, EMEA, Americas, Global. Select the best match.\n"
            "2. target_companies: If missing from brief, infer 4-8 relevant companies based on context. "
            "   Do NOT use any prefix like '(Suggested)'. Use plain company names.\n"
            "3. project_questions: If missing or insufficient, generate at least 3 and up to 10 "
            "   detailed, open-ended research questions based on the brief.\n"
            "4. target_geographies: If empty, infer likely target countries from context.\n\n"
            "Return ONLY the JSON object, no other text, no markdown fences."
        )
        raw = gemini_generate(self.api_key, self.model, system, email_text, temperature=0.2)
        if not raw:
            return {}
        try:
            clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
            return json.loads(clean)
        except Exception:
            return {}

    def _answer_analysis_query(self, state: dict, user_text: str) -> tuple[str, dict]:
        """Answer an analysis/context question using the stored email and SAM analysis."""
        email_ctx = state.get("email_context") or ""
        sam_ctx = state.get("sam_analysis") or ""
        fields_ctx = json.dumps(state.get("fields", {}), indent=2)

        system = (
            SAM_SYSTEM_PROMPT
            + "\n\n---\n"
            "You are answering an analyst's follow-up question about the project. "
            "Use the provided email brief and prior analysis as your context. "
            "Be concise, professional, and actionable. "
            "If generating outreach copy, respect word limits strictly."
        )
        prompt = (
            f"Client Email / Brief:\n{email_ctx}\n\n"
            f"Prior SAM Analysis:\n{sam_ctx}\n\n"
            f"Current Project Fields:\n{fields_ctx}\n\n"
            f"Analyst Question / Request:\n{user_text}"
        )
        raw = gemini_generate(self.api_key, self.model, system, prompt, temperature=0.4, max_output_tokens=4096)
        answer = raw.strip() if raw else "I could not generate an answer. Please try rephrasing."
        return answer, state

    def _answer_focus_instruction(self, email_text: str, instruction: str, sam_analysis: str) -> str:
        """Answer a focus instruction provided alongside the email."""
        system = (
            SAM_SYSTEM_PROMPT
            + "\n\n---\n"
            "You are responding to an additional analyst request made alongside the project brief. "
            "Use the brief and analysis as context."
        )
        prompt = (
            f"Client Email / Brief:\n{email_text}\n\n"
            f"SAM Analysis:\n{sam_analysis}\n\n"
            f"Additional Analyst Request:\n{instruction}"
        )
        raw = gemini_generate(self.api_key, self.model, system, prompt, temperature=0.4, max_output_tokens=4096)
        return raw.strip() if raw else "_Could not process the additional request._"

    def _apply_edit(self, fields: dict, user_text: str) -> tuple[dict, str]:
        system = (
            "You are a form editing assistant. Given the current project fields as JSON and "
            "a user instruction, return a JSON object with ONLY the fields that need to be updated. "
            "Return ONLY valid JSON, no other text."
        )
        prompt = f"Current fields:\n{json.dumps(fields, indent=2)}\n\nUser instruction: {user_text}"
        raw = gemini_generate(self.api_key, self.model, system, prompt, temperature=0.1)
        if not raw:
            return fields, "Could not parse the edit. Please try rephrasing."
        try:
            clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
            updates = json.loads(clean)
            fields.update(updates)
            return fields, "Updated: " + ", ".join(f"**{k}**" for k in updates.keys())
        except Exception:
            return fields, "Could not parse the edit. Please try rephrasing."

    # ─────────────────────────────────────────────────────────────────────────
    # Query / intent detection
    # ─────────────────────────────────────────────────────────────────────────
    def _is_analysis_query(self, text: str) -> bool:
        t = text.lower().strip()
        return any(kw in t for kw in ANALYSIS_KEYWORDS)

    def _looks_like_field_answer(self, current_key: str, text: str) -> bool:
        """Return True if the text looks like a direct answer to the current field type."""
        if not current_key:
            return False
        fd = next((f for f in SEQUENTIAL_FIELDS if f["key"] == current_key), None)
        if not fd:
            return False
        ftype = fd.get("type", "text")
        t = text.strip()
        if ftype == "number":
            return bool(re.search(r"\d+", t)) and len(t) < 15
        if ftype == "date":
            return bool(re.search(r"\d{4}", t)) and len(t) < 20
        if ftype == "choice":
            choices = [c.lower() for c in fd.get("choices", [])]
            return any(c in t.lower() for c in choices)
        return False

    def _split_email_and_context(self, raw_message: str) -> tuple[str, str]:
        """
        Use heuristics to split a user message into:
          (email_content, focus_instruction)
        Focus instruction is text the user adds AFTER the email that modifies
        how the analysis should be performed (e.g. "also compare the PQs").
        """
        # Common patterns that indicate a transition from email to instruction
        transitions = [
            r"\n+(?:also|additionally|please|can you|could you|and also|and|note:|focus on|help me|i also want)[: ]",
            r"\n+(?:compare|analyse|analyze|generate|write|draft|create)[: ]",
        ]
        for pat in transitions:
            m = re.search(pat, raw_message, re.IGNORECASE)
            if m and m.start() > 100:   # email part must be at least 100 chars
                email_part = raw_message[:m.start()].strip()
                focus_part = raw_message[m.start():].strip()
                return email_part, focus_part
        return raw_message.strip(), ""

    # ─────────────────────────────────────────────────────────────────────────
    # Lookup loader
    # ─────────────────────────────────────────────────────────────────────────
    def _load_lookups(self, db) -> dict:
        from models import Client, User, HasamexUser
        clients = Client.query.order_by(Client.client_name).all()
        users = User.query.order_by(User.user_name).all()
        h_users = HasamexUser.query.filter_by(is_active=True).all()
        return {
            "clients": [{"client_id": c.client_id, "client_name": c.client_name} for c in clients],
            "users": [{"user_id": u.user_id, "user_name": u.user_name, "client_id": u.client_id} for u in users],
            "hasamex_users": [{"id": u.id, "name": u.username} for u in h_users],
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Data helpers
    # ─────────────────────────────────────────────────────────────────────────
    def _empty_fields(self) -> dict:
        return {
            "project_title": None, "project_description": None,
            "project_questions": [], "compliance_question_1": None,
            "target_companies": [], "target_functions_titles": None,
            "target_functions": [], "target_region": None,
            "target_geographies": [], "current_former_both": None,
            "project_type": None, "client_id": None, "client_name_raw": None,
            "poc_user_id": None, "poc_user_name_raw": None,
            "received_date": None, "project_deadline": None,
            "number_of_calls": None, "scheduled_calls_count": 0,
            "completed_calls_count": 0, "goal_calls_count": None,
            "client_solution_owner_ids": [], "sales_team_ids": [],
        }

    def _parse_answer(self, field_def: dict, raw: str) -> object:
        ftype = field_def.get("type", "text")
        raw = raw.strip()
        if ftype == "number":
            try:
                return int(raw)
            except Exception:
                nums = re.findall(r"\d+", raw)
                return int(nums[0]) if nums else None
        if ftype == "date":
            m = re.search(r"(\d{4}-\d{2}-\d{2})", raw)
            if m:
                return m.group(1)
            m2 = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", raw)
            if m2:
                d, mo, y = m2.group(1), m2.group(2), m2.group(3)
                return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
            return raw
        if ftype == "choice":
            for c in field_def.get("choices", []):
                if c.lower() in raw.lower() or raw.lower() in c.lower():
                    return c
            return raw
        return raw
