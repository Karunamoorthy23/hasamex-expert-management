import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from extensions import db

# Load environment variables
load_dotenv('flask.env')

def create_app():
    app = Flask(__name__)
    
    from config import Config
    app.config.from_object(Config)

    # Enable CORS for configured frontend origins
    cors_origins = app.config.get('CORS_ORIGINS') or ['http://localhost:5173']
    if isinstance(cors_origins, str):
        cors_origins = [o.strip() for o in cors_origins.split(',') if o.strip()]
    CORS(app, resources={r"/api/v1/*": {"origins": cors_origins}})

    db.init_app(app)

    # Register blueprints
    from routes.experts import experts_bp
    from routes.lookups import lookups_bp
    from routes.import_experts import import_experts_bp
    from routes.clients import clients_bp
    from routes.projects import projects_bp
    from routes.users import users_bp

    app.register_blueprint(experts_bp)
    app.register_blueprint(lookups_bp)
    app.register_blueprint(import_experts_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(users_bp)

    # Configure and create uploads folder for expert PDFs
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'expert_pdf')
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    from flask import send_from_directory
    @app.route('/expert_pdf/<path:filename>')
    def serve_expert_pdf(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)

    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get("PORT", 8080))
    # Run development server
    app.run(host="0.0.0.0", port=port, debug=True)
