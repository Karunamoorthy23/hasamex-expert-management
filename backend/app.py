import os
import re
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

from extensions import db, mail
from auth import decode_token

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), 'flask.env'))

def create_app():
    app = Flask(__name__)
    
    from config import Config
    app.config.from_object(Config)

    # Enable CORS for both hardcoded and environment-based origins
    cors_origins = app.config.get('CORS_ORIGINS')
    print(f"STARTUP: Allowing CORS for origins: {cors_origins}")
    
    preview_pattern = r"^https://hasamex-expert-management(?:-[a-z0-9]+)?\.vercel\.app$"
    cors_rules = list(cors_origins or [])
    cors_rules.append(preview_pattern)
    CORS(app, resources={r"/*": {
        "origins": cors_rules,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
    }})

    db.init_app(app)
    mail.init_app(app)
    
    # Log the database URI (redacted password)
    with app.app_context():
        uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        # Simple redaction for password
        if '@' in uri:
            parts = uri.split('@')
            user_pass = parts[0].split(':')
            if len(user_pass) > 2:
                redacted_uri = f"{user_pass[0]}:****@{parts[1]}"
                print(f"DATABASE: Connecting to {redacted_uri}")

    @app.before_request
    def debug_request_info():
        print(f"Incoming Request: {request.method} {request.path}")

    @app.after_request
    def ensure_cors_headers(response):
        origin = request.headers.get('Origin')
        allowed = set(cors_origins or [])
        preview_match = bool(origin and re.match(preview_pattern, origin))
        if origin and (origin in allowed or preview_match):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Vary'] = 'Origin'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        return response

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Pass through HTTP errors
        if isinstance(e, HTTPException):
            response = jsonify({
                "error": e.name,
                "details": e.description,
                "type": "HTTPException"
            })
            # Explicitly set CORS headers for error responses
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, e.code

        # now you're handling non-HTTP exceptions only
        print(f"GLOBAL ERROR: {str(e)}")
        import traceback
        print(traceback.format_exc())
        response = jsonify({
            "error": "Internal Server Error",
            "details": str(e),
            "type": e.__class__.__name__
        })
        # Explicitly set CORS headers for error responses
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

    @app.before_request
    def _enforce_jwt_for_private_api():
        # Allow preflight requests
        if request.method == 'OPTIONS':
            return None

        path = request.path or ''
        if not path.startswith('/api/v1/'):
            return None

        # Public endpoints
        if path.startswith('/api/v1/auth/') or path == '/api/v1/health' or path.startswith('/api/v1/public/') or path.startswith('/api/v1/n8n/'):
            return None

        auth_header = request.headers.get('Authorization') or ''
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        token = auth_header.split(' ', 1)[1].strip()
        if not token:
            return jsonify({'error': 'Unauthorized'}), 401

        # n8n service token bypass (machine-to-machine auth)
        service_token = os.getenv('N8N_SERVICE_TOKEN')
        if service_token and token == service_token:
            request.jwt_claims = {'service': 'n8n', 'user_id': None}  # type: ignore[attr-defined]
            return None

        try:
            claims = decode_token(token)
            request.jwt_claims = claims  # type: ignore[attr-defined]
        except Exception:
            return jsonify({'error': 'Unauthorized'}), 401

        # Validate the token maps to an active Hasamex (internal) user
        try:
            from models import HasamexUser
            user_id = claims.get('user_id')
            if not user_id:
                return jsonify({'error': 'Unauthorized'}), 401
            user = HasamexUser.query.get(user_id)
            if not user or user.is_active is False:
                return jsonify({'error': 'Unauthorized'}), 401
        except Exception:
            return jsonify({'error': 'Unauthorized'}), 401

        return None

    # Register blueprints
    from routes.experts import experts_bp
    from routes.lookups import lookups_bp
    from routes.import_experts import import_experts_bp
    from routes.clients import clients_bp
    from routes.projects import projects_bp, public_projects_bp
    from routes.users import users_bp
    from routes.auth import auth_bp
    from routes.engagements import engagements_bp
    from routes.employees import employees_bp
    from routes.locations import locations_bp
    from routes.leads import leads_bp
    from routes.ingest import ingest_bp
    from routes.n8n_webhook import n8n_bp
    from routes.chat import chat_bp

    app.register_blueprint(experts_bp)
    app.register_blueprint(lookups_bp)
    app.register_blueprint(import_experts_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(public_projects_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(engagements_bp)
    app.register_blueprint(employees_bp)
    app.register_blueprint(locations_bp)
    app.register_blueprint(leads_bp)
    app.register_blueprint(ingest_bp)
    app.register_blueprint(n8n_bp)
    app.register_blueprint(chat_bp)

    # Configure and create uploads folder for expert PDFs
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'expert_pdf')
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    from flask import send_from_directory
    @app.route('/expert_pdf/<path:filename>')
    def serve_expert_pdf(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)

    CANDIDATE_UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'candidate_files')
    if not os.path.exists(CANDIDATE_UPLOAD_FOLDER):
        os.makedirs(CANDIDATE_UPLOAD_FOLDER)

    @app.route('/candidate_files/<path:filename>')
    def serve_candidate_file(filename):
        return send_from_directory(CANDIDATE_UPLOAD_FOLDER, filename)

    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            "status": "online",
            "message": "Hasamex API is running", 
            "version": "1.0.0",
            "db_connected": db.engine.url.host if hasattr(db, 'engine') and db.engine else "not_yet_initialized"
        }), 200

    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get("PORT"))
    app.run(host="0.0.0.0", port=port, debug=True)
