"""
send_expert_report endpoint — added to projects_bp

POST /api/v1/projects/<id>/send-expert-report
Body:
{
  "expert_ids": ["uuid1", ...],      // selected accepted experts
  "recipient": "myself" | "client",  // who to send to
  "rates": { "uuid1": 150, ... }     // client rate per expert (USD/hr)
}

- "myself"  → sends to the logged-in HasamexUser's email (from JWT)
- "client"  → sends to all User emails mapped via project.poc_user_id +
              any Users whose client_id matches project.client_id
- Only Accepted-status experts are included in the report.

Email body per expert (numbered Expert#01 … Expert#0N):
  - Bio
  - Employment History
  - Availability (timezone + form-submitted slots)
  - Project Questions & Expert Answers (from ProjectFormSubmission)
  - Client Rate (from request body)
"""

from flask import Blueprint, request, jsonify, current_app
import threading
from extensions import db
from auth import decode_token
from models import Project, Expert, ProjectFormSubmission, HasamexUser, User


# ─────────────────────────────────────────────────────────────────────────────
# HTML Email builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_expert_report_html(project, experts_data):
    """
    Build a rich HTML email containing all selected accepted experts' details.
    experts_data: list of dicts with expert + submission + rate info.
    """
    p_title = project.project_title or project.title or "Project"
    p_code  = f"PRJ-{project.project_id}"
    count   = len(experts_data)

    # Header
    html = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {{ font-family: Arial, sans-serif; color: #222; background: #f5f5f5; margin: 0; padding: 0; }}
  .wrapper {{ max-width: 700px; margin: 24px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.10); }}
  .header {{ padding: 28px 32px 14px 32px; color: #111; border-bottom: 1px solid #dde4ee; }}
  .header h1 {{ margin: 0 0 6px; font-size: 1.4rem; color: #1a2e4a; }}
  .header p {{ margin: 0; font-size: 0.9rem; color: #556; }}
  .summary-bar {{ background: #eef2f7; padding: 14px 32px; border-bottom: 1px solid #dde4ee; font-size: 0.88rem; color: #445; }}
  .expert-card {{ border-bottom: 2px solid #e0e8f5; padding: 28px 32px; }}
  .expert-card:last-child {{ border-bottom: none; }}
  .expert-num {{ display: inline-block; background: #1a2e4a; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-bottom: 8px; letter-spacing: .05em; }}
  .expert-name {{ font-size: 1.1rem; font-weight: 700; color: #111; margin: 0 0 4px; }}
  .expert-title {{ font-size: 0.88rem; color: #556; margin: 0 0 14px; }}
  .section-label {{ font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6677aa; margin: 16px 0 6px; border-bottom: 1px solid #e8edf5; padding-bottom: 4px; }}
  .bio {{ font-size: 0.88rem; color: #334; line-height: 1.65; }}
  .exp-item {{ margin: 4px 0; font-size: 0.86rem; color: #334; }}
  .exp-role {{ font-weight: 600; color: #111; }}
  .exp-co {{ color: #556; }}
  .exp-yr {{ font-size: 0.78rem; color: #889; margin-left: 6px; }}
  .slot-badge {{ display: inline-block; background: #e8f0fe; color: #1a3a7a; border: 1px solid #b8cef8; border-radius: 4px; padding: 3px 10px; font-size: 0.80rem; font-weight: 600; margin: 2px 3px 2px 0; }}
  .qa-item {{ background: #f8faff; border-left: 3px solid #b8cef8; border-radius: 0 5px 5px 0; padding: 8px 12px; margin: 6px 0; }}
  .qa-q {{ font-size: 0.83rem; font-weight: 700; color: #1a3a7a; margin-bottom: 4px; }}
  .qa-a {{ font-size: 0.85rem; color: #334; line-height: 1.55; }}
  .rate-pill {{ display: inline-block; background: #dcfce7; color: #14532d; border: 1px solid #86efac; border-radius: 20px; padding: 5px 16px; font-size: 0.88rem; font-weight: 700; margin-top: 6px; }}
  .avail-tz {{ font-size: 0.82rem; color: #556; margin-bottom: 6px; }}
  .footer {{ background: #f0f4f8; text-align: center; padding: 18px 32px; font-size: 0.78rem; color: #889; border-top: 1px solid #dde4ee; }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>{p_title} | Hasamex</h1>
    <p>{p_code} &nbsp;|&nbsp; {count} Accepted Expert{"s" if count != 1 else ""} Selected</p>
  </div>
  <div class="summary-bar">
    This report contains profiles of <strong>{count}</strong> accepted expert{"s" if count != 1 else ""} for your review.
  </div>
"""

    for idx, ed in enumerate(experts_data, 1):
        expert    = ed["expert"]
        sub       = ed["submission"]       # ProjectFormSubmission or None
        rate      = ed["rate"]             # float or None
        num_label = f"Expert #{idx:02d}"

        name  = f"{expert.first_name or ''} {expert.last_name or ''}".strip() or "Expert"
        title = expert.title_headline or ""
        bio   = expert.bio or "No bio available."
        tz    = expert.timezone or (expert.rel_location.timezone if expert.rel_location else None) or "—"

        # Employment history
        exp_html = ""
        if expert.experiences:
            for exp in expert.experiences:
                yr = f"{exp.start_year or '??'} – {exp.end_year or 'Present'}"
                exp_html += f"""
            <div class="exp-item">
              <span class="exp-role">{exp.role_title}</span>
              <span class="exp-co"> @ {exp.company_name}</span>
              <span class="exp-yr">({yr})</span>
            </div>"""
        else:
            exp_html = "<div class='exp-item'>No employment history on file.</div>"

        # Availability slots from submission
        slots_html = ""
        if sub and sub.availability_dates:
            slots = sub.availability_dates if isinstance(sub.availability_dates, list) else []
            if slots:
                for slot in slots:
                    d  = slot.get("date", "")
                    st = slot.get("startTime", "")
                    et = slot.get("endTime", "")
                    slots_html += f'<span class="slot-badge">{d} &nbsp;{st}–{et}</span>'
            else:
                slots_html = "<em>No slots submitted.</em>"
        else:
            slots_html = "<em>No form submission yet.</em>"

        # Q&A
        qa_html = ""
        if sub and sub.project_qns_ans:
            qas = sub.project_qns_ans if isinstance(sub.project_qns_ans, dict) else {}
            for q, a in qas.items():
                ans_text = a if isinstance(a, str) else str(a or "—")
                qa_html += f"""
            <div class="qa-item">
              <div class="qa-q">{q}</div>
              <div class="qa-a">{ans_text}</div>
            </div>"""
        if not qa_html:
            qa_html = "<em>No project Q&amp;A submitted.</em>"

        # Rate
        rate_html = f'<span class="rate-pill">Client Rate: USD {rate:,.0f}/hr</span>' if rate else '<span style="color:#889;font-size:0.84rem;">Rate not specified</span>'

        html += f"""
  <div class="expert-card">
    <div class="expert-num">{num_label}</div>
    <div class="expert-title">{title}</div>

    <div class="section-label">Bio</div>
    <div class="bio">{bio}</div>

    <div class="section-label">Employment History</div>
    {exp_html}

    <div class="section-label">Availability</div>
    <div class="avail-tz">Timezone: <strong>{tz}</strong></div>
    {slots_html}

    <div class="section-label">Project Q&amp;A</div>
    {qa_html}

    <div class="section-label">Client Rate</div>
    {rate_html}
  </div>
"""

    html += """
  <div class="footer">
    This is a confidential expert report generated by Hasamex HUB. Please do not forward externally.
  </div>
</div>
</body>
</html>"""

    return html


# ─────────────────────────────────────────────────────────────────────────────
# Background sender
# ─────────────────────────────────────────────────────────────────────────────

def _bg_send_expert_report(app, project_id, expert_ids, rates, recipient_emails, sender_email):
    """Background thread: build HTML report and send email."""
    with app.app_context():
        from services.mailer import send_email
        import logging

        project = Project.query.get(project_id)
        if not project:
            return

        experts = Expert.query.filter(Expert.id.in_(expert_ids)).all()
        if not experts:
            return

        experts_data = []
        for expert in experts:
            sub = ProjectFormSubmission.query.filter_by(
                project_id=project_id, expert_id=expert.id
            ).first()
            rate = rates.get(str(expert.id)) or rates.get(expert.id) or None
            if rate:
                try:
                    rate = float(rate)
                except (ValueError, TypeError):
                    rate = None
            experts_data.append({"expert": expert, "submission": sub, "rate": rate})

        p_title = project.project_title or project.title or "Project"
        subject = f"Expert Report — {p_title} ({len(experts_data)} Accepted Expert{'s' if len(experts_data) != 1 else ''})"

        try:
            html = _build_expert_report_html(project, experts_data)
            send_email(
                to=recipient_emails,
                subject=subject,
                html=html,
                reply_to=sender_email,
            )
            logging.info(f"Expert report sent to {recipient_emails} for project {project_id}")
        except Exception as e:
            logging.error(f"Failed to send expert report: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Route registration helper (call from projects.py)
# ─────────────────────────────────────────────────────────────────────────────

def register_send_expert_report(projects_bp):
    """Register the send-expert-report route on the provided blueprint."""

    @projects_bp.route('/<int:project_id>/send-expert-report', methods=['POST'])
    def send_expert_report(project_id):
        """
        POST /api/v1/projects/<id>/send-expert-report
        Body: { expert_ids, recipient, rates }
        """
        project = Project.query.get_or_404(project_id)
        data = request.get_json() or {}

        expert_ids = data.get("expert_ids") or []
        recipient  = (data.get("recipient") or "myself").lower()
        rates      = data.get("rates") or {}    # { expert_id: rate }

        if not expert_ids:
            return jsonify({"error": "No expert_ids provided"}), 400
        if recipient not in ("myself", "client"):
            return jsonify({"error": "recipient must be 'myself' or 'client'"}), 400

        # ── Resolve sender from JWT ──
        sender_email = None
        current_user = None
        try:
            auth = request.headers.get("Authorization") or ""
            if auth.startswith("Bearer "):
                claims = decode_token(auth.split(" ", 1)[1].strip())
                user_id = claims.get("user_id")
                sender_email = claims.get("email")
                if user_id:
                    current_user = HasamexUser.query.get(user_id)
                    if current_user:
                        sender_email = current_user.email
        except Exception:
            pass

        # ── Resolve recipient emails ──
        if recipient == "myself":
            if not sender_email:
                return jsonify({"error": "Could not determine your email. Please log in again."}), 401
            recipient_emails = [sender_email]

        else:  # "client"
            emails = set()

            # 1. PoC users (from users table)
            if project.poc_user_ids:
                poc_users = User.query.filter(User.user_id.in_(project.poc_user_ids)).all()
                for poc in poc_users:
                    if poc.email:
                        emails.add(poc.email.strip())

            if not emails:
                return jsonify({
                    "error": "No PoC client email addresses found for this project. "
                             "Ensure the project has PoC users assigned with valid emails."
                }), 400

            recipient_emails = list(emails)

        # ── Filter to Accepted experts only ──
        accepted_ids = set(project.accepted_expert_ids or [])
        filtered_ids = [eid for eid in expert_ids if str(eid) in accepted_ids]

        if not filtered_ids:
            return jsonify({
                "error": "None of the selected experts have Accepted status. "
                         "Only Accepted experts are included in the expert report."
            }), 400

        # ── Fire background email ──
        app = current_app._get_current_object()
        threading.Thread(
            target=_bg_send_expert_report,
            args=(app, project_id, filtered_ids, rates, recipient_emails, sender_email),
            daemon=True,
        ).start()

        return jsonify({
            "message": f"Expert report is being sent to {', '.join(recipient_emails)}.",
            "expert_count": len(filtered_ids),
            "recipients": recipient_emails,
        }), 200
