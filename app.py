# Flask application for the University Research Opportunity Portal

# Import the Flask tools we need: the app itself, the request data, JSON replies, and HTML pages
from flask import Flask, request, jsonify, render_template

# Import SQLAlchemy to work with the MySQL database
from flask_sqlalchemy import SQLAlchemy

# Import date tools to validate application deadlines
from datetime import datetime

# Import os so we can read environment variables (keeps passwords out of the code)
import os

# Import quote_plus so special characters in the password cannot break the database URL
from urllib.parse import quote_plus

# Import load_dotenv so we can read the settings stored in the .env file
from dotenv import load_dotenv


# Read the .env file (if it exists) and load its values as environment variables
load_dotenv()

# Read the database settings; the second value is the default if the setting is missing
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_NAME = os.environ.get("DB_NAME", "research_portal")


# Create the Flask application
app = Flask(__name__)

# Build the database connection URL from the settings above
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}/{DB_NAME}"
)

# Disable unnecessary modification tracking
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the database extension
db = SQLAlchemy(app)


# Define the Research Opportunity database table
class ResearchOpportunity(db.Model):
    # The name of the table in MySQL
    __tablename__ = "research_opportunities"

    # Unique ID, created automatically by the database
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # Research title (max 200 characters, required)
    research_title = db.Column(db.String(200), nullable=False)
    # Research description (long text, required)
    research_description = db.Column(db.Text, nullable=False)
    # Research area (max 150 characters, required)
    research_area = db.Column(db.String(150), nullable=False)
    # Faculty member's name (max 150 characters, required)
    faculty_name = db.Column(db.String(150), nullable=False)
    # Department (max 100 characters, required)
    department = db.Column(db.String(100), nullable=False)
    # Required skills (max 300 characters, required)
    required_skills = db.Column(db.String(300), nullable=False)
    # Number of available positions (whole number, required)
    available_positions = db.Column(db.Integer, nullable=False)
    # Application deadline (a date, required)
    application_deadline = db.Column(db.Date, nullable=False)
    # Status can only be Open or Closed; new records start as Open
    status = db.Column(
        db.Enum("Open", "Closed"),
        nullable=False,
        default="Open"
    )

    # Convert a database record into a dictionary for JSON responses
    def to_dict(self):
        return {
            "id": self.id,
            "research_title": self.research_title,
            "research_description": self.research_description,
            "research_area": self.research_area,
            "faculty_name": self.faculty_name,
            "department": self.department,
            "required_skills": self.required_skills,
            "available_positions": self.available_positions,
            # Dates are not JSON friendly, so we turn them into YYYY-MM-DD text
            "application_deadline": self.application_deadline.isoformat(),
            "status": self.status
        }


# List the fields required when creating an opportunity
REQUIRED_FIELDS = [
    "research_title",
    "research_description",
    "research_area",
    "faculty_name",
    "department",
    "required_skills",
    "available_positions",
    "application_deadline"
]

# All fields the client is allowed to change
EDITABLE_FIELDS = REQUIRED_FIELDS + ["status"]

# Maximum text length allowed for each field (must match the database columns)
MAX_LENGTHS = {
    "research_title": 200,
    "research_area": 150,
    "faculty_name": 150,
    "department": 100,
    "required_skills": 300
}


# Validate incoming data before saving it
# Returns an error message (text) if something is wrong, or None if everything is fine
def validate_opportunity(data, partial=False):
    # The body must be a JSON object, not a list, number, or empty/broken JSON
    if not isinstance(data, dict):
        return "Request body must be a JSON object."

    # A new opportunity must include all required fields
    if not partial:
        # Collect every required field that is missing from the data
        missing = [
            field for field in REQUIRED_FIELDS
            if field not in data
        ]
        # If anything is missing, tell the client exactly which fields
        if missing:
            return "Missing required fields: " + ", ".join(missing)

    # Check text fields
    text_fields = [
        "research_title",
        "research_description",
        "research_area",
        "faculty_name",
        "department",
        "required_skills"
    ]

    # Loop through each text field that was sent
    for field in text_fields:
        if field in data:
            # It must be a string and not empty or only spaces
            if not isinstance(data[field], str) or not data[field].strip():
                return field + " must be a non-empty string."
            # It must not be longer than the database column allows
            if field in MAX_LENGTHS and len(data[field]) > MAX_LENGTHS[field]:
                return (
                    field + " must be at most "
                    + str(MAX_LENGTHS[field]) + " characters."
                )

    # Check the number of available positions
    if "available_positions" in data:
        positions = data["available_positions"]
        # type(...) is int also rejects True/False, which Python treats as numbers
        if type(positions) is not int or positions < 0:
            return "available_positions must be a non-negative integer."

    # Check the date format
    if "application_deadline" in data:
        try:
            # If the text is not a real YYYY-MM-DD date, this raises an error
            datetime.strptime(data["application_deadline"], "%Y-%m-%d")
        except (ValueError, TypeError):
            return "application_deadline must use YYYY-MM-DD format."

    # Check the allowed status values
    if "status" in data and data["status"] not in ("Open", "Closed"):
        return "status must be Open or Closed."

    # Reject unexpected fields (for example "id" or typos)
    unknown = set(data.keys()) - set(EDITABLE_FIELDS)
    if unknown:
        return "Unknown fields: " + ", ".join(sorted(unknown))

    # No problems found
    return None


# Convert a validated date string into a Python date
def convert_date(data):
    # Only convert if the client actually sent a deadline
    if "application_deadline" in data:
        data["application_deadline"] = datetime.strptime(
            data["application_deadline"], "%Y-%m-%d"
        ).date()
    return data


# Render the home page
@app.route("/", methods=["GET"])
def home():
    # Send the HTML page from the templates folder to the browser
    return render_template("index.html")


# CREATE: add a new research opportunity
@app.route("/api/opportunities", methods=["POST"])
def create_opportunity():
    # Read the JSON body (silent=True returns None instead of crashing on bad JSON)
    data = request.get_json(silent=True)

    # Validate the data; if invalid, reply 400 Bad Request
    error = validate_opportunity(data)
    if error:
        return jsonify({"error": error}), 400

    try:
        # Turn the deadline text into a real date
        data = convert_date(data)

        # Create a Python object representing the new database record
        opportunity = ResearchOpportunity(**data)

        # Save the record in the database
        db.session.add(opportunity)
        db.session.commit()

        # Reply 201 Created with the saved record (including its new ID)
        return jsonify(opportunity.to_dict()), 201

    except Exception:
        # Undo any half-finished database work
        db.session.rollback()
        # Write the real error in the terminal for debugging
        app.logger.exception("Failed to create opportunity")
        # Reply 500 Internal Server Error
        return jsonify({"error": "Internal server error."}), 500


# READ: retrieve all research opportunities
@app.route("/api/opportunities", methods=["GET"])
def get_opportunities():
    try:
        # Get every record from the database, sorted by ID
        opportunities = ResearchOpportunity.query.order_by(
            ResearchOpportunity.id
        ).all()

        # Convert each record to a dictionary and reply 200 OK
        return jsonify([item.to_dict() for item in opportunities]), 200

    except Exception:
        app.logger.exception("Failed to retrieve opportunities")
        return jsonify({"error": "Internal server error."}), 500


# READ: retrieve one opportunity by its ID
@app.route("/api/opportunities/<int:opportunity_id>", methods=["GET"])
def get_opportunity(opportunity_id):
    try:
        # Look up the record by its ID
        opportunity = db.session.get(ResearchOpportunity, opportunity_id)

        # If no record has that ID, reply 404 Not Found
        if opportunity is None:
            return jsonify({"error": "Opportunity not found."}), 404

        # Otherwise reply 200 OK with the record
        return jsonify(opportunity.to_dict()), 200

    except Exception:
        app.logger.exception("Failed to retrieve opportunity")
        return jsonify({"error": "Internal server error."}), 500


# UPDATE: change an existing opportunity
@app.route("/api/opportunities/<int:opportunity_id>", methods=["PUT"])
def update_opportunity(opportunity_id):
    # Read the JSON body
    data = request.get_json(silent=True)

    # partial=True means the client may send only the fields it wants to change
    error = validate_opportunity(data, partial=True)
    if error:
        return jsonify({"error": error}), 400

    # An empty body ({}) would change nothing, so reject it
    if not data:
        return jsonify({"error": "Provide at least one field to update."}), 400

    try:
        # Look up the record by its ID
        opportunity = db.session.get(ResearchOpportunity, opportunity_id)

        # If it does not exist, reply 404 Not Found
        if opportunity is None:
            return jsonify({"error": "Opportunity not found."}), 404

        # Turn the deadline text (if sent) into a real date
        data = convert_date(data)

        # Update only the fields supplied by the client
        for field, value in data.items():
            setattr(opportunity, field, value)

        # Save the changes
        db.session.commit()

        # Reply 200 OK with the updated record
        return jsonify(opportunity.to_dict()), 200

    except Exception:
        db.session.rollback()
        app.logger.exception("Failed to update opportunity")
        return jsonify({"error": "Internal server error."}), 500


# DELETE: remove an opportunity by its ID
@app.route("/api/opportunities/<int:opportunity_id>", methods=["DELETE"])
def delete_opportunity(opportunity_id):
    try:
        # Look up the record by its ID
        opportunity = db.session.get(ResearchOpportunity, opportunity_id)

        # If it does not exist, reply 404 Not Found
        if opportunity is None:
            return jsonify({"error": "Opportunity not found."}), 404

        # Remove the record and save the change
        db.session.delete(opportunity)
        db.session.commit()

        # Reply 200 OK with a confirmation message
        return jsonify({
            "message": "Opportunity deleted successfully."
        }), 200

    except Exception:
        db.session.rollback()
        app.logger.exception("Failed to delete opportunity")
        return jsonify({"error": "Internal server error."}), 500


# Start Flask's development server when this file is run directly
if __name__ == "__main__":
    # debug=True restarts the server on changes and shows detailed errors (development only)
    app.run(debug=True)
