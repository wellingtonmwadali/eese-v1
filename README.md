# AI-Enhanced Event Scheduling Engine

This project is a starter for an AI-enhanced event scheduling engine with a React frontend, a Node.js (TypeScript) backend, and Firebase for database and authentication.

## Getting Started

### Prerequisites

- Node.js and npm
- Firebase account and a new project created

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Frontend:**
    ```bash
    cd EESE-admin
    npm install
    ```

3.  **Backend:**
    ```bash
    cd EESE-api
    npm install
    ```

### Firebase Setup

1.  Go to your Firebase project settings and generate a new private key for the service account.
2.  Save the downloaded JSON file as `firebase-service-account.json` in the `EESE-api` directory.

### Running the application

1.  **Backend:**
    ```bash
    cd EESE-api
    npm start
    ```
    The backend server will start on port 3001.

2.  **Frontend:**
    ```bash
    cd EESE-admin
    npm start
    ```
    The React development server will start on port 3000.

## Project Structure

-   `EESE-admin`: Contains the React application.
-   `EESE-api`: Contains the Node.js Express server.
