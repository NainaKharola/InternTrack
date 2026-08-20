# Web Portal – Student Internship Management System

## Overview

Web Portal is a full-stack web application for managing student internship registrations and administrative workflows.

The system provides:

- Student registration and login
- Admin authentication and dashboard
- Student reference ID generation
- Student approval/rejection workflow
- Internship duration management
- Recommended By / Division management
- Training Management
- Offer Letter generation and management
- Certificate and document generation
- ISM / Proforma / Attendance related document workflows
- Gyapan generation
- File uploads and cloud storage
- Email notifications
- PDF generation from HTML templates
- Student document/status tracking

---

## Technology Stack

### Frontend

- React.js
- Vite
- JavaScript / JSX
- CSS / Tailwind CSS (where used)

### Backend

- Node.js
- Express.js
- JavaScript
- REST APIs

### PDF / Document Generation

- Puppeteer
- HTML
- CSS

### Authentication & Security

- JWT (JSON Web Token)
- bcrypt / bcryptjs
- dotenv
- CORS

---

## Main Project Structure

```text
Web-Portal/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── templates/
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── README.md
└── ...
```

> Folder names may vary slightly depending on the current project version.

---

## Important Dependencies

### Backend Dependencies

The backend uses packages such as:

```text
express
cors
dotenv
jsonwebtoken
bcrypt / bcryptjs
puppeteer
```

Additional packages may be present depending on the current implementation.

### Frontend Dependencies

The frontend uses packages such as:

```text
react
react-dom
react-router-dom
vite
```

Additional UI/helper packages may be present depending on the current implementation.

---

## Installation

### 1. Clone / Copy the Project

```bash
git clone <repository-url>
cd Web-Portal
```

Or open the existing project folder in VS Code.

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies

Open another terminal:

```bash
cd backend
npm install
```

---

## Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000

JWT_SECRET=your_jwt_secret

```

Do **not** commit the real `.env` file to GitHub or share it with others.

---

## Running the Project Locally

### Start Backend

```bash
cd backend
npm start
```

If the project uses a development script:

```bash
npm run dev
```

The backend normally runs on:

```text
http://localhost:5000
```

### Start Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Vite normally provides a local URL similar to:

```text
http://localhost:5173
```

---

## Database

The current application uses MongoDB with Mongoose.

The backend connects to MongoDB using the `MONGO_URI` environment variable.

Main database entities include concepts such as:

- Students
- Admins
- Student registration details
- Training Management information
- Offer Letter information
- Joined status
- Recommended By / Division
- Document information

---

## Student Workflow

```text
Student Registration
        ↓
Reference ID Generated
        ↓
Admin Reviews Registration
        ↓
Approve / Reject
        ↓
Training Management
        ↓
Joined Status
        ↓
Document / Offer Letter Workflows
        ↓
Student Portal
```

---

## Admin Features

The admin panel supports functionality including:

- Admin login
- View students
- Search students
- Filter and sort students
- Approve / reject registrations
- Add remarks
- Manage Recommended By / Division
- Manage student duration
- Training Management
- Generate documents
- Offer Letter management
- Certificate workflows
- ISM / Proforma / Attendance workflows
- Gyapan workflow
- Student status management

---

## Document Generation

The application uses Puppeteer to render HTML/CSS documents and generate PDFs.

The common PDF generation utility is designed to:

1. Launch Puppeteer in headless mode.
2. Load the required HTML template.
3. Render the document.
4. Generate the PDF.
5. Return the PDF to the application.
6. Close the Puppeteer browser after generation.

This prevents unnecessary Chrome processes from remaining open after PDF generation.

---

## File Uploads

Student documents can be uploaded through the backend using Multer.

Files are stored using Cloudinary where configured.

Examples of uploaded documents include:

- Resume
- Result
- Photograph
- Permission Letter
- Other internship-related documents

---

## Email

The application uses Nodemailer with Gmail OAuth2 for sending emails.

Email functionality can be used for workflows such as:

- Registration confirmation
- Reference ID communication
- Offer Letter communication
- Other student notifications

Required Google OAuth2 credentials must be configured through environment variables.

---

## Security

Sensitive configuration must be stored in environment variables.

Never commit:

```text
.env
```

or expose:

```text
Database passwords
JWT secrets
API keys
```

---

## Development Notes

Before modifying existing functionality:

1. Check the relevant frontend component.
2. Check the corresponding backend route/controller.
3. Check the database model.
4. Preserve existing APIs and data structures where possible.
5. Avoid changing existing document layouts unless specifically required.
6. Test both frontend and backend after changes.

---

## Production Deployment

### Frontend

The frontend can be deployed to Vercel.

### Backend

The backend can be deployed to Render.

Production environment variables must be configured separately on the deployment platform.

---

## Important

This README describes the current architecture at a high level. The exact dependency versions should always be taken from:

```text
frontend/package.json
backend/package.json
```

The actual `package-lock.json` files should be used when an exact reproducible installation is required.

