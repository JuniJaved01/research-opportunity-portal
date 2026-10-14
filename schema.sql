-- Create the database if it doesn't exist named "research_portal"
CREATE DATABASE IF NOT EXISTS research_portal;

-- Use the database
USE research_portal;

-- Create the table "research_opportunities" if it doesn't exist
CREATE TABLE IF NOT EXISTS research_opportunities (
    -- The id column is of type INT, auto-incremented, and serves as the primary key
    id INT AUTO_INCREMENT PRIMARY KEY,
    --  The research_title column is of type VARCHAR with a maximum length of 200 characters and cannot be NULL
    research_title VARCHAR(200) NOT NULL,
    -- The research_description column is of type TEXT and cannot be NULL
    research_description TEXT NOT NULL,
    -- The research_area column is of type VARCHAR with a maximum length of 150 characters and cannot be NULL
    research_area VARCHAR(150) NOT NULL,
    -- The faculty_name column is of type VARCHAR with a maximum length of 150 characters and cannot be NULL
    faculty_name VARCHAR(150) NOT NULL,
    -- The department column is of type VARCHAR with a maximum length of 100 characters and cannot be NULL
    department VARCHAR(100) NOT NULL,
    -- The required_skills column is of type VARCHAR with a maximum length of 300 characters and cannot be NULL
    required_skills VARCHAR(300) NOT NULL,
    -- The available_positions column is of type INT and cannot be NULL
    available_positions INT NOT NULL,
    -- The application_deadline column is of type DATE and cannot be NULL
    application_deadline DATE NOT NULL,
    -- The status column can have values 'Open' or 'Closed', with a default value of 'Open'
    status ENUM('Open', 'Closed') NOT NULL DEFAULT 'Open'
);