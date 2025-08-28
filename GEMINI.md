# Gemini Project Context: Google Sheets AI Assistant

## Project Overview

This project is a Google Apps Script designed to enhance Google Sheets with AI capabilities by integrating with the OpenAI API. It allows users to send data from their spreadsheet to an AI model (gpt-3.5-turbo) with a custom prompt and view the result directly within the Google Sheet interface.

The script is managed using `clasp`, the command-line interface for Google Apps Script development.

**Core Functionality:**

*   **Custom Menu:** Adds a menu named "進階" to the Google Sheets UI.
*   **AI Settings Sidebar:** Provides a sidebar where users can input and save their OpenAI API key.
*   **Data Processing:** Allows users to select a range of cells, provide a custom prompt, and send this data to the OpenAI API for processing.
*   **Result Display:** Shows the AI-generated output in a modal dialog within Google Sheets.
*   **Form Submission Trigger:** Includes a function (`onFormSubmit`) to log details of new Google Form submissions linked to the sheet.

## Key Files

*   `expert.js`: The main JavaScript file containing all the server-side logic for the Google Apps Script. It handles UI creation (menus, sidebars), API key management, calls to the OpenAI API, and data processing.
*   `appsscript.json`: The manifest file for the project. It defines project metadata like the timezone, runtime version (V8), and dependencies.
*   `.clasp.json`: The configuration file for the `clasp` CLI tool. It contains the `scriptId` which links the local code to a specific Google Apps Script project in the cloud.

## Setup and Deployment

This is a Google Apps Script project that is deployed to a specific Google Sheet.

**Prerequisites:**

*   Node.js and npm installed.
*   Google's `clasp` CLI tool installed (`npm install -g @google/clasp`).

**Deployment Steps:**

1.  **Login to Google:**
    ```bash
    clasp login
    ```
2.  **Push Code:** Upload the local files (`expert.js`, `appsscript.json`) to the Google Apps Script project linked by the `scriptId`.
    ```bash
    clasp push
    ```
3.  **Open Project:** Open the script project in the Google Apps Script web editor.
    ```bash
    clasp open
    ```

## Usage

1.  After deployment, open the Google Sheet associated with this script.
2.  A new menu named "進階" will appear.
3.  Click "進階" > "設定" to open the settings sidebar.
4.  Enter your OpenAI API key in the sidebar to authorize the script to make API calls.
5.  Select a range of cells in your sheet that you want to process.
6.  The script will prompt for a custom instruction.
7.  The selected data and your instruction will be sent to OpenAI, and the result will be displayed in a pop-up window.

## Missing Components

The script `expert.js` references a file named `sidebar` in the function `showSidebar()`:

```javascript
var html = HtmlService.createHtmlOutputFromFile('sidebar')
```

This implies there should be a `sidebar.html` file in the project containing the HTML for the settings sidebar. **This file is currently missing from the directory.** It needs to be created to allow users to set their API key.
