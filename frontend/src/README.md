# Frontend - src/ (UI Implementation)

This folder contains the TypeScript/HTML/CSS code for the Electron UI.

## Files to Create

- [ ] **api.ts** - API client for backend communication
  - Functions: `getScores()`, `createScore(data)`
  - Calls: `http://localhost:8000/scores`

- [ ] **renderer.ts** - Event handling and DOM interactions
  - Load scores on startup
  - Handle form submission
  - Update score list
  - Show status messages

- [ ] **styles.css** - Enhanced styling
  - Form styling
  - Score list styling
  - Severity badges (colors)
  - Responsive design

## Current Files

- **index.html** - Main HTML page (already created with form structure)

## Tasks

1. Implement API client (`api.ts`) with fetch calls
2. Implement renderer logic (`renderer.ts`) for form and list
3. Style the UI (`styles.css`) with badges and responsive design
4. Test form submission
5. Test score list loading

## API Endpoints to Call

- `GET /scores` - Retrieve all stored scores
- `POST /scores` - Create new vulnerability score
