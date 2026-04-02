"""
SQLAlchemy models for Hasamex Expert Database.
"""

import uuid
from datetime import datetime
from extensions import db
from sqlalchemy.dialects.postgresql import UUID, JSONB


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

class LkEngagementMethod(db.Model):
    __tablename__ = 'lk_engagement_methods'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class LkPostCallStatus(db.Model):
    __tablename__ = 'lk_post_call_statuses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class LkPaymentStatus(db.Model):
    __tablename__ = 'lk_payment_statuses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)


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
    location_id = db.Column(db.Integer, db.ForeignKey('lk_location.id'))
    rel_location = db.relationship('LkLocation', lazy='joined')
    
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
    rating = db.Column(db.Integer, default=0)
    last_modified = db.Column(db.DateTime)
    total_calls_completed = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Hasamex internal: who found/owns the client solution for this expert
    client_solution_owner_id = db.Column(db.Integer, db.ForeignKey('hasamex_users.id'), nullable=True)
    rel_client_solution_owner = db.relationship('HasamexUser', foreign_keys=[client_solution_owner_id], lazy='joined')

    experiences = db.relationship('ExpertExperience', backref='expert', lazy='joined', cascade='all, delete-orphan')
    strengths = db.relationship('ExpertStrength', backref='expert', lazy='joined', cascade='all, delete-orphan')

    @property
    def salutation(self): return self.rel_salutation.name if self.rel_salutation else None
    @property
    def location(self): return self.rel_location.display_name if self.rel_location else None
    @property
    def timezone(self): return self.rel_location.timezone if self.rel_location else None
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
    def client_solution_owner_name(self): return self.rel_client_solution_owner.username if self.rel_client_solution_owner else None

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
            'rating': self.rating,
            'notes': self.notes,
            'payment_details': self.payment_details,
            'events_invited_to': self.events_invited_to,
            'profile_pdf_url': self.profile_pdf_url,
            'last_modified': self.last_modified.isoformat() if self.last_modified else None,
            'total_calls_completed': self.total_calls_completed,
            'client_solution_owner_id': self.client_solution_owner_id,
            'client_solution_owner_name': self.rel_client_solution_owner.username if self.rel_client_solution_owner else None,
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

    preferred_contact_method = db.Column(db.String(100))
    location_id = db.Column(db.Integer, db.ForeignKey('lk_location.id', ondelete='SET NULL'), nullable=True)
    avg_calls_per_month = db.Column(db.Integer)
    status = db.Column(db.String(50))
    notes = db.Column(JSONB)
    user_manager = db.Column(db.String(255))
    ai_generated_bio = db.Column(db.Text)
    client_solution_owner_ids = db.Column(db.Text)
    sales_team_ids = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = db.relationship('Client', foreign_keys=[client_id])
    rel_location = db.relationship('LkLocation', foreign_keys=[location_id], lazy='joined')

    def to_dict(self):
        full_name = " ".join([p for p in [self.first_name, self.last_name] if p]).strip() or None
        def _split_csv_ids(txt):
            if not txt: return []
            parts = [p.strip() for p in str(txt).split(',') if p and str(p).strip()]
            return parts
        from models import HasamexUser
        def _to_int_list(csv_txt):
            ids = []
            for x in _split_csv_ids(csv_txt):
                try:
                    ids.append(int(x))
                except (ValueError, TypeError):
                    continue
            return ids
        sol_ids = _to_int_list(self.client_solution_owner_ids)
        sales_ids = _to_int_list(self.sales_team_ids)
        sol_users = HasamexUser.query.filter(HasamexUser.id.in_(sol_ids)).all() if sol_ids else []
        sales_users = HasamexUser.query.filter(HasamexUser.id.in_(sales_ids)).all() if sales_ids else []
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
            'location': self.rel_location.display_name if self.rel_location else None,
            'location_id': self.location_id,
            'location_display_name': self.rel_location.display_name if self.rel_location else None,
            'preferred_contact_method': self.preferred_contact_method,
            'time_zone': self.rel_location.timezone if self.rel_location else None,
            'avg_calls_per_month': self.avg_calls_per_month,
            'status': self.status,
            'notes': self.notes,
            'user_manager': self.user_manager,
            'ai_generated_bio': self.ai_generated_bio,
            'client_solution_owner_ids': sol_ids,
            'client_solution_owner_names': [u.username for u in sol_users],
            'sales_team_ids': sales_ids,
            'sales_team_names': [u.username for u in sales_users],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class LkLocation(db.Model):
    __tablename__ = 'lk_location'
    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(100))
    country = db.Column(db.String(100))
    display_name = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    timezone = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HasamexUser(db.Model):
    __tablename__ = 'hasamex_users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), nullable=False)
    first_name = db.Column(db.String(120))
    last_name = db.Column(db.String(120))
    title = db.Column(db.String(255))
    pan_number = db.Column(db.String(20))
    aadhar_number = db.Column(db.String(20))
    date_of_joining = db.Column(db.Date)
    linkedin_url = db.Column(db.String(500))
    mobile = db.Column(db.String(50))
    reporting_manager_id = db.Column(db.Integer, db.ForeignKey('hasamex_users.id', ondelete='SET NULL'))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    manager = db.relationship('HasamexUser', remote_side=[id], lazy='joined')

    def to_auth_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'username': self.username,
            'is_active': self.is_active,
        }
    
    def to_dict(self):
        display_name = " ".join([p for p in [self.first_name, self.last_name] if p]).strip() or self.username
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'title': self.title,
            'role': self.role,
            'pan_number': self.pan_number,
            'aadhar_number': self.aadhar_number,
            'date_of_joining': self.date_of_joining.isoformat() if self.date_of_joining else None,
            'linkedin_url': self.linkedin_url,
            'mobile': self.mobile,
            'reporting_manager_id': self.reporting_manager_id,
            'reporting_manager_name': (" ".join([p for p in [self.manager.first_name, self.manager.last_name] if p]).strip()) if self.manager else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'username': self.username,
            'display_name': display_name,
        }


class HasamexPasswordResetToken(db.Model):
    __tablename__ = 'hasamex_password_reset_tokens'
    id = db.Column(db.Integer, primary_key=True)
    hasamex_user_id = db.Column(db.Integer, db.ForeignKey('hasamex_users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = db.Column(db.Text, unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('HasamexUser', lazy='joined')

class HasamexOTP(db.Model):
    __tablename__ = 'hasamex_otps'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    service_rules = db.Column(db.Text)

    # New: client solution owners (Hasamex users), sales team (Hasamex users), and linked experts
    client_solution_owner_ids = db.Column(db.Text)  # comma-separated hasamex_user ids
    sales_team_ids = db.Column(db.Text)            # comma-separated hasamex_user ids
    expert_ids = db.Column(db.Text)                # comma-separated expert UUIDs

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
        def _split_csv_ids(txt):
            if not txt: return []
            parts = [p.strip() for p in str(txt).split(',') if p and str(p).strip()]
            # keep as strings; cast where needed on consumer side
            return parts
        from models import HasamexUser, Expert  # local import to avoid circulars
        # resolve names for hasamex user ids
        def _to_int_list(csv_txt):
            ids = []
            for x in _split_csv_ids(csv_txt):
                try:
                    ids.append(int(x))
                except (ValueError, TypeError):
                    continue
            return ids
            
        sol_ids = _to_int_list(self.client_solution_owner_ids)
        sales_ids = _to_int_list(self.sales_team_ids)
        sol_users = HasamexUser.query.filter(HasamexUser.id.in_(sol_ids)).all() if sol_ids else []
        sales_users = HasamexUser.query.filter(HasamexUser.id.in_(sales_ids)).all() if sales_ids else []
        exp_ids = _split_csv_ids(self.expert_ids)
        exp_rows = Expert.query.filter(Expert.id.in_(exp_ids)).all() if exp_ids else []
        exp_map = {e.id: f"{e.expert_id}" for e in exp_rows}
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
            'service_rules': self.service_rules,
            # new fields
            'client_solution_owner_ids': sol_ids,
            'client_solution_owner_names': [u.username for u in sol_users],
            'sales_team_ids': sales_ids,
            'sales_team_names': [u.username for u in sales_users],
            'expert_ids': exp_ids,
            'expert_codes': [exp_map.get(x, x) for x in exp_ids],

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
    engagement_ids = db.Column(JSONB, nullable=False, default=list)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    client_solution_owner_ids = db.Column(db.Text)
    sales_team_ids = db.Column(db.Text)
    leads_expert_ids = db.Column(JSONB, nullable=False, default=list)
    invited_expert_ids = db.Column(JSONB, nullable=False, default=list)
    accepted_expert_ids = db.Column(JSONB, nullable=False, default=list)
    declined_expert_ids = db.Column(JSONB, nullable=False, default=list)
    expert_scheduled = db.Column(JSONB, nullable=False, default=list)
    expert_call_completed = db.Column(JSONB, nullable=False, default=list)
    scheduled_calls_count = db.Column(db.Integer, default=0)
    completed_calls_count = db.Column(db.Integer, default=0)
    goal_calls_count = db.Column(db.Integer, default=0)

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
        def _split_csv_ids(txt):
            if not txt: return []
            parts = [p.strip() for p in str(txt).split(',') if p and str(p).strip()]
            return parts
        from models import HasamexUser
        def _to_int_list(csv_txt):
            ids = []
            for x in _split_csv_ids(csv_txt):
                try:
                    ids.append(int(x))
                except (ValueError, TypeError):
                    continue
            return ids
        sol_ids = _to_int_list(self.client_solution_owner_ids)
        sales_ids = _to_int_list(self.sales_team_ids)
        sol_users = HasamexUser.query.filter(HasamexUser.id.in_(sol_ids)).all() if sol_ids else []
        sales_users = HasamexUser.query.filter(HasamexUser.id.in_(sales_ids)).all() if sales_ids else []
        leads = self.leads_expert_ids or []
        invited = self.invited_expert_ids or []
        accepted = self.accepted_expert_ids or []
        declined = getattr(self, 'declined_expert_ids', []) or []
        scheduled_assigned = self.expert_scheduled or []
        completed_assigned = self.expert_call_completed or []
        s_count = self.scheduled_calls_count or 0
        c_count = self.completed_calls_count or 0
        g_count = self.goal_calls_count or 0
        progress = 0.0
        if g_count and g_count > 0:
            try:
                progress = round((c_count / g_count) * 100, 2)
            except Exception:
                progress = 0.0
        return {
            'project_id': self.project_id,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
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
            'client_solution_owner_ids': sol_ids,
            'client_solution_owner_names': [u.username for u in sol_users],
            'sales_team_ids': sales_ids,
            'sales_team_names': [u.username for u in sales_users],
            'last_modified_time': self.last_modified_time.isoformat() if self.last_modified_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'leads_count': len(leads),
            'invited_count': len(invited),
            'accepted_count': len(accepted),
            'declined_count': len(declined),
            'scheduled_calls_count': s_count,
            'completed_calls_count': c_count,
            'expert_scheduled_count': len(scheduled_assigned),
            'expert_call_completed_count': len(completed_assigned),
            'goal_calls_count': g_count,
            'progress_percent': progress,
            'leads_expert_ids': leads,
            'invited_expert_ids': invited,
            'accepted_expert_ids': accepted,
            'declined_expert_ids': declined,
            'expert_scheduled': scheduled_assigned,
            'expert_call_completed': completed_assigned,
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

class Engagement(db.Model):
    __tablename__ = 'engagements'
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    engagement_code = db.Column(db.String(32), unique=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id'), nullable=False)
    expert_id = db.Column(UUID(as_uuid=False), db.ForeignKey('experts.id'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.client_id'), nullable=False)
    poc_user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    call_owner_id = db.Column(db.Integer, db.ForeignKey('hasamex_users.id'))
    call_date = db.Column(db.DateTime, nullable=False)
    actual_call_duration_mins = db.Column(db.Integer)
    engagement_method_id = db.Column(db.Integer, db.ForeignKey('lk_engagement_methods.id'))
    notes = db.Column(db.Text)
    transcript_link_folder = db.Column(db.String(512))
    client_rate = db.Column(db.Numeric(12, 2))
    client_currency_id = db.Column(db.Integer, db.ForeignKey('lk_currencies.id'))
    discount_offered_percent = db.Column(db.Numeric(5, 2), default=0)
    billable_client_amount_usd = db.Column(db.Numeric(12, 2))
    expert_rate = db.Column(db.Numeric(12, 2))
    expert_currency_id = db.Column(db.Integer, db.ForeignKey('lk_currencies.id'))
    prorated_expert_amount_base = db.Column(db.Numeric(12, 2))
    prorated_expert_amount_usd = db.Column(db.Numeric(12, 2))
    gross_margin_percent = db.Column(db.Numeric(5, 2))
    gross_profit_usd = db.Column(db.Numeric(12, 2))
    expert_post_call_status_id = db.Column(db.Integer, db.ForeignKey('lk_post_call_statuses.id'))
    expert_payment_due_date = db.Column(db.Date)
    actual_expert_payment_date = db.Column(db.Date)
    expert_payment_status_id = db.Column(db.Integer, db.ForeignKey('lk_payment_statuses.id'))
    expert_paid_from = db.Column(db.String(100))
    expert_payout_ref_id = db.Column(db.String(255))
    client_invoice_number = db.Column(db.String(100))
    client_invoice_date = db.Column(db.Date)
    client_payment_received_date = db.Column(db.Date)
    client_payment_received_account = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = db.relationship('Project', backref='engagements')
    expert = db.relationship('Expert', backref='engagements')
    client = db.relationship('Client', backref='engagements')
    poc_user = db.relationship('User', backref='engagements')
    call_owner = db.relationship('HasamexUser', backref='engagements')
    engagement_method = db.relationship('LkEngagementMethod', lazy='joined')
    client_currency = db.relationship('LkCurrency', foreign_keys=[client_currency_id], lazy='joined')
    expert_currency = db.relationship('LkCurrency', foreign_keys=[expert_currency_id], lazy='joined')
    expert_post_call_status = db.relationship('LkPostCallStatus', lazy='joined')
    expert_payment_status = db.relationship('LkPaymentStatus', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'engagement_id': self.engagement_code,
            'project_id': self.project_id,
            'project_name': self.project.title if self.project else None,
            'expert_id': self.expert_id,
            'expert_name': f"{self.expert.first_name} {self.expert.last_name}" if self.expert else None,
            'client_id': self.client_id,
            'client_name': self.client.client_name if self.client else None,
            'poc_user_id': self.poc_user_id,
            'poc_user_name': self.poc_user.user_name if self.poc_user else None,
            'call_owner_id': self.call_owner_id,
            'call_owner_name': self.call_owner.username if self.call_owner else None,
            'call_date': self.call_date.isoformat() if self.call_date else None,
            'actual_call_duration_mins': self.actual_call_duration_mins,
            # Engagement method (both id and name for form prefill)
            'engagement_method_id': self.engagement_method.id if self.engagement_method else None,
            'engagement_method': self.engagement_method.name if self.engagement_method else None,
            'notes': self.notes,
            'transcript_link_folder': self.transcript_link_folder,
            'client_rate': float(self.client_rate) if self.client_rate else None,
            # Currencies (both id and name for form prefill)
            'client_currency_id': self.client_currency.id if self.client_currency else self.client_currency_id,
            'client_currency': self.client_currency.name if self.client_currency else None,
            'discount_offered_percent': float(self.discount_offered_percent) if self.discount_offered_percent else None,
            'billable_client_amount_usd': float(self.billable_client_amount_usd) if self.billable_client_amount_usd else None,
            'expert_rate': float(self.expert_rate) if self.expert_rate else None,
            'expert_currency_id': self.expert_currency.id if self.expert_currency else self.expert_currency_id,
            'expert_currency': self.expert_currency.name if self.expert_currency else None,
            'prorated_expert_amount_base': float(self.prorated_expert_amount_base) if self.prorated_expert_amount_base else None,
            'prorated_expert_amount_usd': float(self.prorated_expert_amount_usd) if self.prorated_expert_amount_usd else None,
            'gross_margin_percent': float(self.gross_margin_percent) if self.gross_margin_percent else None,
            'gross_profit_usd': float(self.gross_profit_usd) if self.gross_profit_usd else None,
            # Post-call + Payment statuses (both id and name)
            'expert_post_call_status_id': self.expert_post_call_status.id if self.expert_post_call_status else self.expert_post_call_status_id,
            'expert_post_call_status': self.expert_post_call_status.name if self.expert_post_call_status else None,
            'expert_payment_due_date': self.expert_payment_due_date.isoformat() if self.expert_payment_due_date else None,
            'actual_expert_payment_date': self.actual_expert_payment_date.isoformat() if self.actual_expert_payment_date else None,
            'expert_payment_status_id': self.expert_payment_status.id if self.expert_payment_status else self.expert_payment_status_id,
            'expert_payment_status': self.expert_payment_status.name if self.expert_payment_status else None,
            'expert_paid_from': self.expert_paid_from,
            'expert_payout_ref_id': self.expert_payout_ref_id,
            'client_invoice_number': self.client_invoice_number,
            'client_invoice_date': self.client_invoice_date.isoformat() if self.client_invoice_date else None,
            'client_payment_received_date': self.client_payment_received_date.isoformat() if self.client_payment_received_date else None,
            'client_payment_received_account': self.client_payment_received_account,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class LeadClient(db.Model):
    __tablename__ = 'leadclients'
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    company_name = db.Column(db.String(255), nullable=False)
    current_role = db.Column('role_title', db.String(255), nullable=False)
    business_email = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    received_date = db.Column(db.Date)
    status = db.Column(db.String(32), default='Backlog')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'company_name': self.company_name,
            'current_role': self.current_role,
            'business_email': self.business_email,
            'description': self.description,
            'received_date': self.received_date.isoformat() if self.received_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class LeadExpert(db.Model):
    __tablename__ = 'leadexperts'
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    linkedin_url = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    received_date = db.Column(db.Date)
    status = db.Column(db.String(32), default='Backlog')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'city': self.city,
            'email': self.email,
            'phone_number': self.phone_number,
            'linkedin_url': self.linkedin_url,
            'description': self.description,
            'received_date': self.received_date.isoformat() if self.received_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class LeadCandidate(db.Model):
    __tablename__ = 'leadcandidates'
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    linkedin_url = db.Column(db.String(500), nullable=False)
    resume_url = db.Column(db.String(1000), nullable=False)
    received_date = db.Column(db.Date)
    status = db.Column(db.String(32), default='Backlog')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'city': self.city,
            'email': self.email,
            'phone_number': self.phone_number,
            'linkedin_url': self.linkedin_url,
            'resume_url': self.resume_url,
            'received_date': self.received_date.isoformat() if self.received_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class ProjectFormSubmission(db.Model):
    __tablename__ = 'project_form_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id', ondelete='CASCADE'), nullable=False)
    expert_id = db.Column(UUID(as_uuid=False), db.ForeignKey('experts.id', ondelete='CASCADE'), nullable=False)
    availability_dates = db.Column(JSONB)
    project_qns_ans = db.Column(JSONB)
    compliance_onboarding = db.Column(JSONB)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'expert_id': self.expert_id,
            'availability_dates': self.availability_dates,
            'project_qns_ans': self.project_qns_ans,
            'compliance_onboarding': self.compliance_onboarding,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
