import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from extensions import db, mail
from auth import decode_token

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), 'flask.env'))

def create_app():
    app = Flask(__name__)
    
    from config import Config
    app.config.from_object(Config)

    # Enable CORS for configured frontend origins with full permissions
    cors_origins = app.config.get('CORS_ORIGINS')
    if isinstance(cors_origins, str):
        cors_origins = [o.strip() for o in cors_origins.split(',') if o.strip()]
    CORS(app, resources={r"/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"]
    }})

    db.init_app(app)
    mail.init_app(app)

    @app.before_request
    def debug_request_info():
        print(f"Incoming Request: {request.method} {request.path}")

    @app.before_request
    def _enforce_jwt_for_private_api():
        # Allow preflight requests
        if request.method == 'OPTIONS':
            return None

        path = request.path or ''
        if not path.startswith('/api/v1/'):
            return None

        # Public endpoints
        if path.startswith('/api/v1/auth/') or path == '/api/v1/health':
            return None

        auth_header = request.headers.get('Authorization') or ''
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        token = auth_header.split(' ', 1)[1].strip()
        if not token:
            return jsonify({'error': 'Unauthorized'}), 401

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
    from routes.projects import projects_bp
    from routes.users import users_bp
    from routes.auth import auth_bp

    app.register_blueprint(experts_bp)
    app.register_blueprint(lookups_bp)
    app.register_blueprint(import_experts_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(auth_bp)

    # Configure and create uploads folder for expert PDFs
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'expert_pdf')
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    from flask import send_from_directory
    @app.route('/expert_pdf/<path:filename>')
    def serve_expert_pdf(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)

    @app.route('/', methods=['GET'])
    def index():
        return jsonify({"message": "Hasamex API is running", "version": "1.0.0"}), 200

    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    # Explicitly set the port to 8080
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
