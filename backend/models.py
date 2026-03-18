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

class LkProjectType(db.Model):
    __tablename__ = 'lk_project_type'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class LkProjectTargetGeography(db.Model):
    __tablename__ = 'lk_project_target_geographies'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)


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

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    # Display ID (e.g. "US-0030")
    user_code = db.Column(db.String(50), unique=True, nullable=True)

    # Basic identity
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    # Optional single-field display name (legacy)
    user_name = db.Column(db.String(255), nullable=False)

    designation_title = db.Column(db.String(255))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    seniority = db.Column(db.String(100))
    linkedin_url = db.Column(db.String(500))

    # FK to clients table (do NOT show in frontend table)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id', ondelete='SET NULL'), nullable=True)

    location = db.Column(db.String(255))
    preferred_contact_method = db.Column(db.String(100))
    time_zone = db.Column(db.String(100))
    avg_calls_per_month = db.Column(db.Integer)
    status = db.Column(db.String(50))
    notes = db.Column(db.Text)
    user_manager = db.Column(db.String(255))
    ai_generated_bio = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = db.relationship('Client', foreign_keys=[client_id])

    def to_dict(self):
        full_name = " ".join([p for p in [self.first_name, self.last_name] if p]).strip() or None
        return {
            'user_id': self.user_id,
            'user_name': self.user_name,
            'user_code': self.user_code,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': full_name,
            'designation_title': self.designation_title,
            'email': self.email,
            'phone': self.phone,
            'seniority': self.seniority,
            'linkedin_url': self.linkedin_url,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
            'client_type': self.client.client_type if self.client else None,
            'location': self.location,
            'preferred_contact_method': self.preferred_contact_method,
            'time_zone': self.time_zone,
            'avg_calls_per_month': self.avg_calls_per_month,
            'status': self.status,
            'notes': self.notes,
            'user_manager': self.user_manager,
            'ai_generated_bio': self.ai_generated_bio,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class HasamexUser(db.Model):
    __tablename__ = 'hasamex_users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_auth_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'username': self.username,
            'is_active': self.is_active,
        }


class HasamexPasswordResetToken(db.Model):
    __tablename__ = 'hasamex_password_reset_tokens'
    id = db.Column(db.Integer, primary_key=True)
    hasamex_user_id = db.Column(db.Integer, db.ForeignKey('hasamex_users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = db.Column(db.Text, unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('HasamexUser', lazy='joined')

class Client(db.Model):
    __tablename__ = 'clients'
    client_id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(255), nullable=False)

    # Business identifier shown in UI (e.g. "CL-0025")
    client_code = db.Column(db.String(50), unique=True, nullable=True)

    client_type = db.Column(db.String(100))
    office_locations = db.Column(db.Text)  # comma-separated locations
    number_of_offices = db.Column(db.Integer)
    country = db.Column(db.String(100))
    website = db.Column(db.String(500))
    linkedin_url = db.Column(db.String(500))

    # Primary contact user (external / client-side), if modeled
    primary_contact_user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)

    # Internal client manager (free text for now)
    client_manager_internal = db.Column(db.String(255))

    billing_currency = db.Column(db.String(20))
    payment_terms = db.Column(db.String(255))
    invoicing_email = db.Column(db.String(255))
    client_status = db.Column(db.String(50))
    engagement_start_date = db.Column(db.Date)

    notes = db.Column(db.Text)
    business_activity_summary = db.Column(db.Text)
    signed_msa = db.Column(db.Boolean)
    commercial_model = db.Column(db.String(255))
    agreed_pricing = db.Column(db.Text)

    users = db.Column(db.Text)  # free-text list of client users
    number_of_users = db.Column(db.Integer)
    msa = db.Column(db.Text)

    # Legacy fields (kept for backward compatibility)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    location = db.Column(db.String(255))
    status = db.Column(db.String(50))
    company = db.Column(db.String(255))
    type = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Two separate relationships to users; specify foreign_keys to avoid ambiguity.
    user = db.relationship('User', foreign_keys=[user_id], backref='clients')
    primary_contact_user = db.relationship(
        'User',
        foreign_keys=[primary_contact_user_id],
        backref='primary_contact_for_clients'
    )
    projects = db.relationship('Project', backref='client', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'client_id': self.client_id,
            'client_name': self.client_name,
            'client_code': self.client_code,
            'client_type': self.client_type,
            'office_locations': self.office_locations,
            'number_of_offices': self.number_of_offices,
            'country': self.country,
            'website': self.website,
            'linkedin_url': self.linkedin_url,
            'primary_contact_user_id': self.primary_contact_user_id,
            'client_manager_internal': self.client_manager_internal,
            'billing_currency': self.billing_currency,
            'payment_terms': self.payment_terms,
            'invoicing_email': self.invoicing_email,
            'client_status': self.client_status,
            'engagement_start_date': self.engagement_start_date.isoformat() if self.engagement_start_date else None,
            'notes': self.notes,
            'business_activity_summary': self.business_activity_summary,
            'signed_msa': self.signed_msa,
            'commercial_model': self.commercial_model,
            'agreed_pricing': self.agreed_pricing,
            'users': self.users,
            'number_of_users': self.number_of_users,
            'msa': self.msa,

            # legacy passthrough
            'user_id': self.user_id,
            'location': self.location,
            'status': self.status,
            'company': self.company,
            'type': self.type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class Project(db.Model):
    __tablename__ = 'projects'
    project_id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    sector = db.Column(db.String(100))
    description = db.Column(db.Text)
    status = db.Column(db.String(50))
    received_date = db.Column(db.Date)
    project_title = db.Column(db.String(255))
    project_type_id = db.Column(db.Integer, db.ForeignKey('lk_project_type.id', ondelete='SET NULL'))
    project_description = db.Column(db.Text)
    target_companies = db.Column(db.Text)
    target_region_id = db.Column(db.Integer, db.ForeignKey('lk_regions.id', ondelete='SET NULL'))
    target_functions_titles = db.Column(db.Text)
    current_former_both = db.Column(db.String(20))
    number_of_calls = db.Column(db.Integer)
    profile_question_1 = db.Column(db.Text)
    profile_question_2 = db.Column(db.Text)
    profile_question_3 = db.Column(db.Text)
    compliance_question_1 = db.Column(db.Text)
    project_deadline = db.Column(db.Date)
    poc_user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'))
    project_created_by = db.Column(db.String(255))
    last_modified_time = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    allocations = db.relationship('ProjectExpert', backref='project', lazy=True, cascade='all, delete-orphan')
    calls = db.relationship('Call', backref='project', lazy=True, cascade='all, delete-orphan')
    rel_project_type = db.relationship('LkProjectType', lazy='joined')
    rel_target_region = db.relationship('LkRegion', foreign_keys=[target_region_id], lazy='joined')
    rel_poc_user = db.relationship('User', foreign_keys=[poc_user_id], lazy='joined')
    target_geographies = db.relationship(
        'LkProjectTargetGeography',
        secondary='project_target_geographies',
        lazy='joined'
    )

    def to_dict(self):
        return {
            'project_id': self.project_id,
            'client_id': self.client_id,
            'title': self.title,
            'sector': self.sector,
            'description': self.description,
            'status': self.status,
            'received_date': self.received_date.isoformat() if self.received_date else None,
            'project_title': self.project_title,
            'project_type': self.rel_project_type.name if self.rel_project_type else None,
            'project_description': self.project_description,
            'target_companies': self.target_companies,
            'target_region': self.rel_target_region.name if self.rel_target_region else None,
            'target_geographies': [g.name for g in self.target_geographies] if self.target_geographies else [],
            'target_functions_titles': self.target_functions_titles,
            'current_former_both': self.current_former_both,
            'number_of_calls': self.number_of_calls,
            'profile_question_1': self.profile_question_1,
            'profile_question_2': self.profile_question_2,
            'profile_question_3': self.profile_question_3,
            'compliance_question_1': self.compliance_question_1,
            'project_deadline': self.project_deadline.isoformat() if self.project_deadline else None,
            'poc_user_id': self.poc_user_id,
            'poc_user_name': self.rel_poc_user.user_name if self.rel_poc_user else None,
            'project_created_by': self.project_created_by,
            'last_modified_time': self.last_modified_time.isoformat() if self.last_modified_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class ProjectTargetGeography(db.Model):
    __tablename__ = 'project_target_geographies'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id', ondelete='CASCADE'), primary_key=True)
    geography_id = db.Column(db.Integer, db.ForeignKey('lk_project_target_geographies.id', ondelete='CASCADE'), primary_key=True)

class ProjectExpert(db.Model):
    __tablename__ = 'project_experts'
    project_expert_id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    expert_id = db.Column(UUID(as_uuid=False), db.ForeignKey('experts.id', ondelete='CASCADE'), nullable=False)
    stage = db.Column(db.String(50))
    call_completed = db.Column(db.Boolean, default=False)
    call_date = db.Column(db.DateTime)
    expert_rate = db.Column(db.Numeric(10, 2))
    
    expert = db.relationship('Expert', backref='project_allocations')

    def to_dict(self):
        return {
            'project_expert_id': self.project_expert_id,
            'project_id': self.project_id,
            'expert_id': self.expert_id,
            'stage': self.stage,
            'call_completed': self.call_completed,
            'call_date': self.call_date.isoformat() if self.call_date else None,
            'expert_rate': float(self.expert_rate) if self.expert_rate else None,
        }

class Call(db.Model):
    __tablename__ = 'calls'
    call_id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    expert_id = db.Column(UUID(as_uuid=False), db.ForeignKey('experts.id', ondelete='CASCADE'), nullable=False)
    client_user = db.Column(db.String(255))
    zoom_link = db.Column(db.String(500))
    recording_url = db.Column(db.String(500))
    transcript_url = db.Column(db.String(500))
    call_status = db.Column(db.String(50))
    
    expert = db.relationship('Expert', backref='calls')

    def to_dict(self):
        return {
            'call_id': self.call_id,
            'project_id': self.project_id,
            'expert_id': self.expert_id,
            'client_user': self.client_user,
            'zoom_link': self.zoom_link,
            'recording_url': self.recording_url,
            'transcript_url': self.transcript_url,
            'call_status': self.call_status,
        }
