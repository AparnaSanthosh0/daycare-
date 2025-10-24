# TinyTots Repository Reference

## Project Structure Overview
- **root**: Contains shared documentation, npm workspace configuration, and top-level scripts.
- **client**: React frontend application.
- **server**: Node/Express backend API.
- **tests**: End-to-end Playwright tests and harness.
- **query**: Utility scripts for database inspection or quick queries.

## Common Tooling
- **Package managers**: npm in both root, client, and server.
- **Frontend**: React 18 with React Router, Context API, and Tailwind/SCSS styling utilities.
- **Backend**: Express.js with MongoDB (Mongoose) models and JWT-based auth.
- **Testing**: Playwright for browser-based smoke tests.

## Key Entry Points
- **Front-end main file**: `client/src/index.js`
- **App component**: `client/src/App.js`
- **Backend server**: `server/index.js`

## Environment & Configuration
- **Client env file**: `client/.env`
- **Server env file**: `server/.env`
- Ensure `REACT_APP_API_URL` matches backend port (default 5000).

## Scripts
- **Root**: `npm run start` (delegates to child packages via workspaces if configured).
- **Client**: `npm start`, `npm run build`, `npm test`.
- **Server**: `npm run dev`, `npm start`.
- **Utility**: Various setup scripts in `server/scripts` for seeding data or verifying configurations.

## Coding Conventions
- **Frontend**: Functional components with hooks, ESLint + Prettier requirements.
- **Backend**: Mongoose models per collection, request validation middleware, consistent async/await usage.

Keep this file updated whenever project structure or tooling changes.