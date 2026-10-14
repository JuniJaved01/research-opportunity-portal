// The address of our backend REST API
const API_URL = "/api/opportunities";

// Get the HTML elements we need to interact with
const form = document.getElementById("opportunity-form");
const opportunityList = document.getElementById("opportunities-list");
const message = document.getElementById("message");
const formHeading = document.getElementById("form-heading");
const submitButton = document.getElementById("submit-button");
const cancelButton = document.getElementById("cancel-button");
const detailsSection = document.getElementById("details-section");
const detailsContent = document.getElementById("details-content");
const hideDetailsButton = document.getElementById("hide-details-button");

// Remember which opportunity is shown in the details section (null = none)
let currentDetailsId = null;

// Remember the timer that hides the message after a few seconds
let messageTimer = null;


// Read all fields from the form and return them as an object
function getFormData() {
    return {
        research_title: document.getElementById("research_title").value.trim(),
        research_description: document.getElementById("research_description").value.trim(),
        research_area: document.getElementById("research_area").value.trim(),
        faculty_name: document.getElementById("faculty_name").value.trim(),
        department: document.getElementById("department").value.trim(),
        required_skills: document.getElementById("required_skills").value.trim(),
        // Convert the typed text into a real number
        available_positions: Number(
            document.getElementById("available_positions").value
        ),
        application_deadline: document.getElementById("application_deadline").value,
        status: document.getElementById("status").value
    };
}


// Check the form before sending it; returns an error message or null if all is fine
function validateForm() {
    // Each pair is [field id, readable name]
    const requiredTextFields = [
        ["research_title", "Research title"],
        ["research_description", "Research description"],
        ["research_area", "Research area"],
        ["faculty_name", "Faculty name"],
        ["department", "Department"],
        ["required_skills", "Required skills"]
    ];

    // Make sure no text field is empty or only spaces
    for (const [id, label] of requiredTextFields) {
        if (document.getElementById(id).value.trim() === "") {
            return label + " is required.";
        }
    }

    // Read the positions as raw text (an empty box would otherwise become 0)
    const positions = document.getElementById("available_positions").value;

    // Positions must be filled in
    if (positions === "") {
        return "Available positions is required.";
    }

    // Positions must be a whole number that is 0 or more
    if (!Number.isInteger(Number(positions)) || Number(positions) < 0) {
        return "Available positions must be a whole number (0 or more).";
    }

    // The deadline must be chosen
    if (document.getElementById("application_deadline").value === "") {
        return "Application deadline is required.";
    }

    // Everything is fine
    return null;
}


// Show a success or error message at the top of the page
function showMessage(text, type = "success") {
    // Put the text in the message box and style it as success or error
    message.textContent = text;
    message.className = type;

    // Cancel any older timer so the new message is not hidden too early
    clearTimeout(messageTimer);

    // Hide the message automatically after 5 seconds
    messageTimer = setTimeout(() => {
        message.textContent = "";
        message.className = "";
    }, 5000);
}


// Send an HTTP request to the API and handle unsuccessful responses
async function apiRequest(url, options = {}) {
    let response;

    try {
        // Send the request (always as JSON)
        response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
    } catch (error) {
        // This happens when the backend server is not running
        throw new Error("Cannot reach the server. Is the backend running?");
    }

    // Read the JSON reply (use an empty object if there is none)
    const result = await response.json().catch(() => ({}));

    // For 400, 404, 500 and other errors, show the error text sent by the API
    if (!response.ok) {
        throw new Error(result.error || "The request failed.");
    }

    return result;
}


// Create an HTML element safely using textContent
function createTextElement(tag, text, className = "") {
    // Make the element (for example <p> or <h3>)
    const element = document.createElement(tag);
    // Put the text inside it (textContent prevents HTML injection)
    element.textContent = text;

    // Add a CSS class if one was given
    if (className) {
        element.className = className;
    }

    return element;
}


// Create one "Label: value" line for the cards and details
function createInfoLine(label, value) {
    // Make an empty paragraph
    const paragraph = document.createElement("p");
    // Make the bold label part
    const strong = createTextElement("strong", label + ": ");
    // Add the label and then the value text into the paragraph
    paragraph.appendChild(strong);
    paragraph.appendChild(document.createTextNode(value));
    return paragraph;
}


// Load and display all opportunities from the API
async function loadOpportunities() {
    // Show a loading text while we wait for the server
    opportunityList.replaceChildren(
        createTextElement("p", "Loading opportunities...")
    );

    try {
        // Ask the API for all opportunities (GET)
        const opportunities = await apiRequest(API_URL);
        // Clear the loading text
        opportunityList.replaceChildren();

        // If the database is empty, say so
        if (opportunities.length === 0) {
            opportunityList.appendChild(
                createTextElement("p", "No research opportunities yet.")
            );
            return;
        }

        // Create one card for each opportunity
        opportunities.forEach((item) => {
            opportunityList.appendChild(createOpportunityCard(item));
        });
    } catch (error) {
        // Show the error inside the list area and as a message
        opportunityList.replaceChildren(
            createTextElement("p", error.message)
        );
        showMessage(error.message, "error");
    }
}


// Build one card for a research opportunity
function createOpportunityCard(item) {
    // The card container
    const card = document.createElement("article");
    card.className = "opportunity-card";

    // The title and the short summary shown on the card
    card.appendChild(createTextElement("h3", item.research_title));
    card.appendChild(createInfoLine("Research Area", item.research_area));
    card.appendChild(createInfoLine("Faculty", item.faculty_name));
    card.appendChild(createInfoLine("Department", item.department));
    card.appendChild(createInfoLine("Available Positions", item.available_positions));
    card.appendChild(createInfoLine("Deadline", item.application_deadline));

    // The status badge (red style if Closed)
    const statusClass = item.status === "Closed" ? "status closed" : "status";
    card.appendChild(createTextElement("span", item.status, statusClass));

    // A row that holds the buttons
    const buttons = document.createElement("div");
    buttons.className = "card-buttons";

    // View Details button: shows the complete information
    const viewButton = createTextElement("button", "View Details");
    viewButton.type = "button";
    viewButton.addEventListener("click", () => viewDetails(item.id));
    buttons.appendChild(viewButton);

    // Edit button: loads this opportunity into the form
    const editButton = createTextElement("button", "Edit");
    editButton.type = "button";
    editButton.addEventListener("click", () => startEditing(item));
    buttons.appendChild(editButton);

    // Close button: only shown while the opportunity is still Open
    if (item.status === "Open") {
        const closeButton = createTextElement(
            "button", "Close Opportunity", "close-opportunity-button"
        );
        closeButton.type = "button";
        closeButton.addEventListener("click", () => closeOpportunity(item.id));
        buttons.appendChild(closeButton);
    }

    // Delete button: removes this opportunity after confirmation
    const deleteButton = createTextElement("button", "Delete", "delete-button");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteOpportunity(item.id));
    buttons.appendChild(deleteButton);

    // Put the buttons inside the card and return the finished card
    card.appendChild(buttons);
    return card;
}


// Fetch one opportunity by ID and show all of its details
async function viewDetails(id) {
    try {
        // Ask the API for this one opportunity (GET /api/opportunities/:id)
        const item = await apiRequest(`${API_URL}/${id}`);

        // Remember which opportunity is being shown
        currentDetailsId = item.id;

        // Clear the old details and add every field
        detailsContent.replaceChildren();
        detailsContent.appendChild(createTextElement("h3", item.research_title));
        detailsContent.appendChild(createInfoLine("ID", item.id));
        detailsContent.appendChild(createInfoLine("Description", item.research_description));
        detailsContent.appendChild(createInfoLine("Research Area", item.research_area));
        detailsContent.appendChild(createInfoLine("Faculty", item.faculty_name));
        detailsContent.appendChild(createInfoLine("Department", item.department));
        detailsContent.appendChild(createInfoLine("Required Skills", item.required_skills));
        detailsContent.appendChild(createInfoLine("Available Positions", item.available_positions));
        detailsContent.appendChild(createInfoLine("Application Deadline", item.application_deadline));
        detailsContent.appendChild(createInfoLine("Status", item.status));

        // Show the details section and scroll down to it
        detailsSection.hidden = false;
        detailsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        // For example a 404 if the opportunity was already deleted
        showMessage(error.message, "error");
        // Refresh the list so it matches the database
        await loadOpportunities();
    }
}


// Hide the details section
function hideDetails() {
    detailsSection.hidden = true;
    detailsContent.replaceChildren();
    currentDetailsId = null;
}

// Hide the details when the Hide Details button is clicked
hideDetailsButton.addEventListener("click", hideDetails);


// Add a new opportunity or update an existing one when the form is submitted
form.addEventListener("submit", async (event) => {
    // Stop the browser from reloading the page
    event.preventDefault();

    // Check the form first; stop here if something is missing or wrong
    const validationError = validateForm();
    if (validationError) {
        showMessage(validationError, "error");
        return;
    }

    // If the hidden ID field has a value, we are editing; otherwise we are creating
    const id = document.getElementById("opportunity-id").value;
    const isEditing = Boolean(id);

    // Editing uses PUT /api/opportunities/:id, creating uses POST /api/opportunities
    const url = isEditing ? `${API_URL}/${id}` : API_URL;
    const method = isEditing ? "PUT" : "POST";

    // Disable the button so it cannot be clicked twice
    submitButton.disabled = true;

    try {
        // Send the form data to the API
        await apiRequest(url, {
            method,
            body: JSON.stringify(getFormData())
        });

        // Show a success message
        showMessage(
            isEditing ? "Opportunity updated successfully." :
                "Opportunity created successfully."
        );

        // Clear the form and reload the list from the database
        resetForm();
        await loadOpportunities();

        // If the edited opportunity is open in the details section, refresh it
        if (isEditing && currentDetailsId === Number(id)) {
            await viewDetails(Number(id));
        }
    } catch (error) {
        // Show the error returned by the API (400, 404, 500, ...)
        showMessage(error.message, "error");
    } finally {
        // Enable the button again
        submitButton.disabled = false;
    }
});


// Fill the form with an existing opportunity for editing
function startEditing(item) {
    // Remember which opportunity we are editing
    document.getElementById("opportunity-id").value = item.id;

    // Copy each value into the form field with the same ID
    Object.entries(item).forEach(([key, value]) => {
        const field = document.getElementById(key);

        if (field && key !== "id") {
            field.value = value;
        }
    });

    // Change the form to "edit mode"
    formHeading.textContent = "Edit Research Opportunity";
    submitButton.textContent = "Save Changes";
    cancelButton.hidden = false;

    // Scroll up so the user sees the form
    form.scrollIntoView({ behavior: "smooth", block: "start" });
}


// Clear the form and return it to create mode
function resetForm() {
    form.reset();
    document.getElementById("opportunity-id").value = "";

    formHeading.textContent = "Add a Research Opportunity";
    submitButton.textContent = "Add Opportunity";
    cancelButton.hidden = true;
}

// Cancel editing when the Cancel button is clicked
cancelButton.addEventListener("click", resetForm);


// Change an opportunity's status from Open to Closed
async function closeOpportunity(id) {
    try {
        // Send only the status field (PUT /api/opportunities/:id)
        await apiRequest(`${API_URL}/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: "Closed" })
        });

        showMessage("Opportunity closed successfully.");

        // Reload the list so the badge turns red and the Close button disappears
        await loadOpportunities();

        // If this opportunity is open in the details section, refresh it too
        if (currentDetailsId === id) {
            await viewDetails(id);
        }
    } catch (error) {
        showMessage(error.message, "error");
    }
}


// Delete an opportunity by its ID
async function deleteOpportunity(id) {
    // Ask the user to confirm; stop if they click Cancel
    if (!confirm("Are you sure you want to delete this opportunity?")) {
        return;
    }

    try {
        // Send the DELETE request
        await apiRequest(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        showMessage("Opportunity deleted successfully.");

        // Hide the details if the deleted opportunity was being shown
        if (currentDetailsId === id) {
            hideDetails();
        }

        // Leave edit mode if the deleted opportunity was being edited
        if (Number(document.getElementById("opportunity-id").value) === id) {
            resetForm();
        }

        // Reload the list from the database
        await loadOpportunities();
    } catch (error) {
        showMessage(error.message, "error");
    }
}


// Load existing opportunities when the page first opens
loadOpportunities();