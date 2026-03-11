"""
SQLAlchemy models for Hasamex Expert Database.
"""

import uuid
from datetime import datetime
from extensions import db


class Expert(db.Model):
    """Expert profile model — maps to 'experts' table."""

    __tablename__ = 'experts'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expert_id = db.Column(db.String(20), unique=True, nullable=False)
    salutation = db.Column(db.String(10))
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    primary_email = db.Column(db.String(255), unique=True)
    secondary_email = db.Column(db.String(255))
    primary_phone = db.Column(db.String(50))
    secondary_phone = db.Column(db.String(50))
    linkedin_url = db.Column(db.String(500), unique=True)
    location = db.Column(db.String(255))
    timezone = db.Column(db.String(100))
    region = db.Column(db.String(50))
    current_employment_status = db.Column(db.String(50))
    seniority = db.Column(db.String(50))
    years_of_experience = db.Column(db.Integer)
    title_headline = db.Column(db.String(500))
    bio = db.Column(db.Text)
    employment_history = db.Column(db.Text)
    primary_sector = db.Column(db.String(100))
    company_role = db.Column(db.String(100))
    expert_function = db.Column(db.String(100))
    strength_topics = db.Column(db.Text)
    currency = db.Column(db.String(10))
    hourly_rate = db.Column(db.Numeric(12, 2))
    hcms_classification = db.Column(db.String(50))
    expert_status = db.Column(db.String(50))
    notes = db.Column(db.Text)
    payment_details = db.Column(db.Text)
    events_invited_to = db.Column(db.Text)
    profile_pdf_url = db.Column(db.String(500))
    last_modified = db.Column(db.DateTime)
    total_calls_completed = db.Column(db.Integer, default=0)
    project_id_added_to = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Serialize expert to dictionary."""
        return {
            'id': self.id,
            'expert_id': self.expert_id,
            'salutation': self.salutation,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'primary_email': self.primary_email,
            'secondary_email': self.secondary_email,
            'primary_phone': self.primary_phone,
            'secondary_phone': self.secondary_phone,
            'linkedin_url': self.linkedin_url,
            'location': self.location,
            'timezone': self.timezone,
            'region': self.region,
            'current_employment_status': self.current_employment_status,
            'seniority': self.seniority,
            'years_of_experience': self.years_of_experience,
            'title_headline': self.title_headline,
            'bio': self.bio,
            'employment_history': self.employment_history,
            'primary_sector': self.primary_sector,
            'company_role': self.company_role,
            'expert_function': self.expert_function,
            'strength_topics': self.strength_topics,
            'currency': self.currency,
            'hourly_rate': float(self.hourly_rate) if self.hourly_rate else None,
            'hcms_classification': self.hcms_classification,
            'expert_status': self.expert_status,
            'notes': self.notes,
            'payment_details': self.payment_details,
            'events_invited_to': self.events_invited_to,
            'profile_pdf_url': self.profile_pdf_url,
            'last_modified': self.last_modified.isoformat() if self.last_modified else None,
            'total_calls_completed': self.total_calls_completed,
            'project_id_added_to': self.project_id_added_to,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Expert {self.expert_id}: {self.first_name} {self.last_name}>'


class LookupTable(db.Model):
    """Lookup values for dropdowns — maps to 'lookup_tables' table."""

    __tablename__ = 'lookup_tables'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category = db.Column(db.String(50), nullable=False)
    value = db.Column(db.String(100), nullable=False)
    display_order = db.Column(db.Integer, default=0)

    __table_args__ = (
        db.UniqueConstraint('category', 'value', name='uq_lookup_category_value'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'value': self.value,
            'display_order': self.display_order,
        }
