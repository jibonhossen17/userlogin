/**
 * doGet(e) handles GET requests to the web app.
 * It supports two main actions: 'save' for adding new user data,
 * and 'search' for finding existing user data.
 *
 * @param {Object} e The event object, containing request parameters.
 * @returns {GoogleAppsScript.Content.TextOutput} A JSON response.
 */
function doGet(e) {
  const sheetName = 'Sheet1'; // Make sure this matches your sheet tab name
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  // Set default response headers for JSON
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!sheet) {
    Logger.log(`Error: Sheet '${sheetName}' not found.`);
    return output.setContent(JSON.stringify({ status: 'error', message: `Sheet '${sheetName}' not found. Please check the sheet name.` }));
  }

  const action = e.parameter.action; // Get the action parameter from the request

  if (action === 'save') {
    // --- SAVE DATA ACTION ---
    const name = e.parameter.name;
    const email = e.parameter.email;
    const phone = e.parameter.phone;

    if (name && email) { // Basic validation: Name and Email are required
      try {
        const data = sheet.getDataRange().getValues(); // Get all existing data
        const headers = data[0]; // Get headers
        const rows = data.slice(1); // Get data rows

        // Find the index of 'Name' and 'Email' columns
        const nameColIndex = headers.findIndex(header => header.toLowerCase() === 'name');
        const emailColIndex = headers.findIndex(header => header.toLowerCase() === 'email');

        if (nameColIndex === -1 || emailColIndex === -1) {
          Logger.log('Error: "Name" or "Email" column not found in sheet headers.');
          return output.setContent(JSON.stringify({ status: 'error', message: 'Required columns (Name, Email) not found in sheet headers.' }));
        }

        // Check for repetitive data (same Name and Email)
        const isRepetitive = rows.some(row =>
          String(row[nameColIndex]).toLowerCase() === String(name).toLowerCase() &&
          String(row[emailColIndex]).toLowerCase() === String(email).toLowerCase()
        );

        if (isRepetitive) {
          Logger.log(`Repetitive data detected: Name: ${name}, Email: ${email}`);
          return output.setContent(JSON.stringify({ status: 'error', message: 'Data is repetitive. A record with this Name and Email already exists.' }));
        }

        const timestamp = new Date();
        sheet.appendRow([timestamp, name, email, phone]);
        Logger.log(`Saved data: Name: ${name}, Email: ${email}, Phone: ${phone}`);
        return output.setContent(JSON.stringify({ status: 'success', message: 'Data saved successfully!' }));
      } catch (error) {
        Logger.log(`Error saving data: ${error.message}`);
        return output.setContent(JSON.stringify({ status: 'error', message: `Failed to save data: ${error.message}` }));
      }
    } else {
      Logger.log('Error: Name and Email are required for saving data.');
      return output.setContent(JSON.stringify({ status: 'error', message: 'Name and Email are required parameters to save data.' }));
    }
  } else if (action === 'search') {
    // --- SEARCH DATA ACTION ---
    const query = e.parameter.query; // The search term
    const searchColumn = e.parameter.column; // Optional: specify column to search (e.g., 'Name', 'Email')

    if (query) {
      try {
        const data = sheet.getDataRange().getValues(); // Get all data from the sheet
        const headers = data[0]; // First row is headers
        const rows = data.slice(1); // Remaining rows are data

        const results = [];
        const lowerCaseQuery = query.toLowerCase();

        // Determine which columns to search
        let columnsToSearch = [];
        if (searchColumn) {
          const colIndex = headers.findIndex(header => header.toLowerCase() === searchColumn.toLowerCase());
          if (colIndex !== -1) {
            columnsToSearch.push(colIndex);
          } else {
            Logger.log(`Warning: Search column '${searchColumn}' not found. Searching all text columns.`);
            // Fallback to all text columns if specified column not found
            columnsToSearch = headers.map((_, i) => i); // Search all columns
          }
        } else {
          // If no specific column is provided, search all columns
          columnsToSearch = headers.map((_, i) => i);
        }

        // Iterate through rows and columns to find matches
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          let rowMatch = false;
          const rowData = {};

          for (let j = 0; j < headers.length; j++) {
            const cellValue = String(row[j] || '').toLowerCase(); // Convert to string and handle empty cells
            rowData[headers[j]] = row[j]; // Store original value for results

            // Check if the current column is one we should search
            if (columnsToSearch.includes(j) && cellValue.includes(lowerCaseQuery)) {
              rowMatch = true;
            }
          }

          if (rowMatch) {
            results.push(rowData);
          }
        }

        Logger.log(`Search for '${query}' in column '${searchColumn || "all"}' found ${results.length} results.`);
        return output.setContent(JSON.stringify({ status: 'success', query: query, results: results }));

      } catch (error) {
        Logger.log(`Error searching data: ${error.message}`);
        return output.setContent(JSON.stringify({ status: 'error', message: `Failed to search data: ${error.message}` }));
      }
    } else {
      Logger.log('Error: Search query is required for searching data.');
      return output.setContent(JSON.stringify({ status: 'error', message: 'Search query is required to search data.' }));
    }
  } else {
    // --- INVALID ACTION ---
    Logger.log('Error: Invalid action specified. Use "save" or "search".');
    return output.setContent(JSON.stringify({ status: 'error', message: 'Invalid action specified. Use "save" or "search".' }));
  }
}
