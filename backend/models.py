"""
SQLAlchemy models for Hasamex Expert Database.
"""

import uuid
from datetime import datetime
from extensions import db
from sqlalchemy.dialects.postgresql import UUID


class LkRegion(db.Model):
    __tablename__ = 'lk_regions'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class LkPrimarySector(db.Model):
    __tablename__ = 'lk_primary_sectors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class LkExpertStatus(db.Model):
    __tablename__ = 'lk_expert_statuses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class LkEmploymentStatus(db.Model):
    __tablename__ = 'lk_employment_statuses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class LkSeniority(db.Model):
    __tablename__ = 'lk_seniorities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class LkCurrency(db.Model):
    __tablename__ = 'lk_currencies'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(10), unique=True, nullable=False)

class LkCompanyRole(db.Model):
    __tablename__ = 'lk_company_roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class LkExpertFunction(db.Model):
    __tablename__ = 'lk_expert_functions'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class LkSalutation(db.Model):
    __tablename__ = 'lk_salutations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(10), unique=True, nullable=False)

class LkHcmsClassification(db.Model):
    __tablename__ = 'lk_hcms_classifications'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)


class ExpertExperience(db.Model):
    __tablename__ = 'expert_experiences'
    id = db.Column(db.Integer, primary_key=True)
    expert_id = db.Column(UUID(as_uuid=False), db.ForeignKey('experts.id', ondelete='CASCADE'), nullable=False)
    company_name = db.Column(db.String(255), nullable=False)
    role_title = db.Column(db.String(255), nullable=False)
    start_year = db.Column(db.Integer)
    end_year = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'company_name': self.company_name,
            'role_title': self.role_title,
            'start_year': self.start_year,
            'end_year': self.end_year
        }

class ExpertStrength(db.Model):
    __tablename__ = 'expert_strengths'
    id = db.Column(db.Integer, primary_key=True)
    expert_id = db.Column(UUID(as_uuid=False), db.ForeignKey('experts.id', ondelete='CASCADE'), nullable=False)
    topic_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return self.topic_name


class Expert(db.Model):
    """Expert profile model — maps to 'experts' table."""

    __tablename__ = 'experts'

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    expert_id = db.Column(db.String(20), unique=True, nullable=False)
    
    salutation_id = db.Column(db.Integer, db.ForeignKey('lk_salutations.id'))
    rel_salutation = db.relationship('LkSalutation', lazy='joined')
    
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    primary_email = db.Column(db.String(255), unique=True)
    secondary_email = db.Column(db.String(255))
    primary_phone = db.Column(db.String(50))
    secondary_phone = db.Column(db.String(50))
    linkedin_url = db.Column(db.String(500), unique=True)
    location = db.Column(db.String(255))
    timezone = db.Column(db.String(100))
    
    region_id = db.Column(db.Integer, db.ForeignKey('lk_regions.id'))
    rel_region = db.relationship('LkRegion', lazy='joined')
    
    current_employment_status_id = db.Column(db.Integer, db.ForeignKey('lk_employment_statuses.id'))
    rel_current_employment_status = db.relationship('LkEmploymentStatus', lazy='joined')
    
    seniority_id = db.Column(db.Integer, db.ForeignKey('lk_seniorities.id'))
    rel_seniority = db.relationship('LkSeniority', lazy='joined')
    
    years_of_experience = db.Column(db.Integer)
    title_headline = db.Column(db.String(500))
    bio = db.Column(db.Text)
    
    primary_sector_id = db.Column(db.Integer, db.ForeignKey('lk_primary_sectors.id'))
    rel_primary_sector = db.relationship('LkPrimarySector', lazy='joined')
    
    company_role_id = db.Column(db.Integer, db.ForeignKey('lk_company_roles.id'))
    rel_company_role = db.relationship('LkCompanyRole', lazy='joined')
    
    expert_function_id = db.Column(db.Integer, db.ForeignKey('lk_expert_functions.id'))
    rel_expert_function = db.relationship('LkExpertFunction', lazy='joined')
    
    currency_id = db.Column(db.Integer, db.ForeignKey('lk_currencies.id'))
    rel_currency = db.relationship('LkCurrency', lazy='joined')
    
    hourly_rate = db.Column(db.Numeric(12, 2))
    
    hcms_classification_id = db.Column(db.Integer, db.ForeignKey('lk_hcms_classifications.id'))
    rel_hcms_classification = db.relationship('LkHcmsClassification', lazy='joined')
    
    expert_status_id = db.Column(db.Integer, db.ForeignKey('lk_expert_statuses.id'))
    rel_expert_status = db.relationship('LkExpertStatus', lazy='joined')
    
    notes = db.Column(db.Text)
    payment_details = db.Column(db.Text)
    events_invited_to = db.Column(db.Text)
    profile_pdf_url = db.Column(db.String(500))
    last_modified = db.Column(db.DateTime)
    total_calls_completed = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    experiences = db.relationship('ExpertExperience', backref='expert', lazy='joined', cascade='all, delete-orphan')
    strengths = db.relationship('ExpertStrength', backref='expert', lazy='joined', cascade='all, delete-orphan')

    @property
    def salutation(self): return self.rel_salutation.name if self.rel_salutation else None
    @property
    def region(self): return self.rel_region.name if self.rel_region else None
    @property
    def current_employment_status(self): return self.rel_current_employment_status.name if self.rel_current_employment_status else None
    @property
    def seniority(self): return self.rel_seniority.name if self.rel_seniority else None
    @property
    def primary_sector(self): return self.rel_primary_sector.name if self.rel_primary_sector else None
    @property
    def company_role(self): return self.rel_company_role.name if self.rel_company_role else None
    @property
    def expert_function(self): return self.rel_expert_function.name if self.rel_expert_function else None
    @property
    def currency(self): return self.rel_currency.name if self.rel_currency else None
    @property
    def hcms_classification(self): return self.rel_hcms_classification.name if self.rel_hcms_classification else None
    @property
    def expert_status(self): return self.rel_expert_status.name if self.rel_expert_status else None

    @property
    def strength_topics(self):
        return "\n".join([s.topic_name for s in self.strengths]) if self.strengths else None
        
    @property
    def employment_history(self):
        if not self.experiences: return None
        history = []
        for exp in self.experiences:
            date_range = f"{exp.start_year or '??'}-{exp.end_year or 'Present'}"
            history.append(f"{exp.role_title}, {exp.company_name} ({date_range})")
        return "\n".join(history)

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
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'experiences': [exp.to_dict() for exp in self.experiences],
            'strengths_list': [s.to_dict() for s in self.strengths]
        }

    def __repr__(self):
        return f'<Expert {self.expert_id}: {self.first_name} {self.last_name}>'
