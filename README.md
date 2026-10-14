# University Research Opportunity Portal

A web application where faculty members can post, view, update, close and delete research opportunities in one place. It consists of a Flask REST API, a MySQL database and a simple HTML/CSS/JavaScript frontend.

**GitHub Repository:** https://github.com/JuniJaved01/research-opportunity-portal

## Technologies

| Part | Technology |
|------|------------|
| Backend | Python, Flask, Flask-SQLAlchemy |
| Database | MySQL (XAMPP / MariaDB) |
| Frontend | HTML, CSS, JavaScript (served by Flask) |
| API testing | Postman |

## Project Structure

```
ResearchOpportunityPortal/
├── app.py                  # Flask backend (REST API + database model)
├── schema.sql              # Database and table setup
├── requirements.txt        # Python dependencies
├── .env.example            # Example database settings (copy to .env)
├── .gitignore
├── templates/
│   └── index.html          # Frontend page
├── static/
│   ├── script.js           # Frontend logic (calls the API)
│   └── style.css           # Frontend styling
├── ResearchPortal.postman_collection.json   # Exported Postman collection
└── README.md
```

## Setup and Run Instructions

### 1. Requirements
- Python 3.10 or newer
- XAMPP (or any MySQL server)

### 2. Set up the database
1. Open the XAMPP Control Panel and start **MySQL**.
2. Open `http://localhost/phpmyadmin` in your browser.
3. Click the **SQL** tab, paste the contents of `schema.sql` and click **Go**.
   This creates the `research_portal` database and the `research_opportunities` table.

### 3. Configure the database connection
1. Copy `.env.example` and rename the copy to `.env`.
2. Edit `.env` and enter your own MySQL details. With a default XAMPP install the password is empty:
```
   DB_USER=root
   DB_PASSWORD=
   DB_HOST=localhost
   DB_NAME=research_portal
```
   The `.env` file is ignored by Git, so no credentials are uploaded.

### 4. Install dependencies
Open a terminal in the project folder and run:
```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
(On macOS/Linux use `source venv/bin/activate` instead of `venv\Scripts\activate`.)

### 5. Start the application
```
python app.py
```
Open `http://127.0.0.1:5000` in your browser. The frontend and the API run on the same server.

## REST API

Base URL: `http://127.0.0.1:5000`

| Operation | Method | Endpoint | Success code |
|-----------|--------|----------|--------------|
| Create an opportunity | POST | `/api/opportunities` | 201 Created |
| Get all opportunities | GET | `/api/opportunities` | 200 OK |
| Get one opportunity | GET | `/api/opportunities/:id` | 200 OK |
| Update an opportunity | PUT | `/api/opportunities/:id` | 200 OK |
| Delete an opportunity | DELETE | `/api/opportunities/:id` | 200 OK |

### Opportunity fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Created automatically |
| `research_title` | string | Required, max 200 characters |
| `research_description` | string | Required |
| `research_area` | string | Required, max 150 characters |
| `faculty_name` | string | Required, max 150 characters |
| `department` | string | Required, max 100 characters |
| `required_skills` | string | Required, max 300 characters |
| `available_positions` | integer | Required, 0 or more |
| `application_deadline` | string | Required, format `YYYY-MM-DD` |
| `status` | string | `Open` (default) or `Closed` |

### Example request

`POST /api/opportunities`
```json
{
  "research_title": "AI for Medical Imaging",
  "research_description": "Detect diseases from X-ray images.",
  "research_area": "Artificial Intelligence",
  "faculty_name": "Dr. Ayesha Khan",
  "department": "Computer Science",
  "required_skills": "Python, PyTorch",
  "available_positions": 2,
  "application_deadline": "2026-12-31"
}
```

### Status codes

| Code | Meaning | When it is returned |
|------|---------|---------------------|
| 200 | OK | Successful read, update or delete |
| 201 | Created | A new opportunity was created |
| 400 | Bad Request | Missing or invalid data (for example a wrong date format) |
| 404 | Not Found | No opportunity exists with the given ID |
| 500 | Internal Server Error | Unexpected server or database error |

## Frontend Features
- View all research opportunities
- View the complete details of one opportunity
- Create a new opportunity using a form
- Edit an existing opportunity
- Close an open opportunity with one click
- Delete an opportunity (with confirmation)
- Success and error messages, plus validation of required fields

## API Testing with Postman
1. Start the application (`python app.py`).
2. In Postman, click **Import** and select `ResearchPortal.postman_collection.json`.
3. Run the requests in order (or use the Collection Runner). The collection:
   1. Creates three research opportunities
   2. Retrieves all opportunities
   3. Retrieves one opportunity by ID
   4. Updates an opportunity
   5. Changes a status from Open to Closed
   6. Deletes an opportunity
   7. Requests the deleted opportunity again (returns 404 Not Found)
   8. Sends invalid data (returns 400 Bad Request)

The base URL is stored in the collection variable `baseUrl` (default `http://127.0.0.1:5000`).

## Demonstration Video
Video:  see the video file included in the submission ZIP as Demonstration.mp4

## Author
Name: Junaid Javed
Reg. No: 22P-9163
Course: CN
Section: BS CS 5C
