# DRDO Internship Registration & Management Portal

A full-stack web application developed for **Defence Research and Development Organisation (DRDO)** to automate the complete internship process, including student registration, admin approval, offer letter generation, training management, Gyapan generation, and certificate generation.

---

# Features

## Student Module

- Student Registration
- Student Login using Email & Reference ID
- Unique Reference ID Generation
- Document Upload
- Registration Confirmation Email
- Download Offer Letter (Approved Students)
- View Application Status

---

## Admin Module

### Authentication

- Secure Admin Login
- JWT Authentication
- Protected Routes

### Student Management

- View All Students
- Search Students
- Filter Students
- Approve / Reject Students
- Delete Student Records

### Offer Letter Module

- Generate Offer Letter
- Preview Offer Letter
- Edit Offer Letter
- Upload Offer Letter
- Send Offer Letter by Email
- PDF Generation using Puppeteer

### Training Management System

- Course Management
- Branch Management
- Year Management
- Duration Management
- Guide Details
- Joining Status
- Completion Status

### Gyapan Module

- Select Multiple Students
- Preview Gyapan
- Generate Official Gyapan
- Download PDF
- Automatic Removal After Generation

### Certificate Module

- Date-wise Filtering
- Student Search
- Generate Certificates
- Individual PDF Download
- Automatic Removal After Generation

---

# Tech Stack

## Frontend

- React.js
- Vite
- React Router DOM
- CSS

## Backend

- Node.js
- Express.js
- Local JSON files
- JWT Authentication
- Multer
- Local uploads folder
- Puppeteer
- Nodemailer
- Google OAuth2

---

# Project Structure

```
Web-Portal
│
├── backend
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── scripts
│   ├── services
│   ├── templates
│   ├── uploads
│   ├── package.json
│   └── server.js
│
├── web-portal
│   ├── public
│   ├── src
│   │   ├── assets
│   │   ├── components
│   │   ├── pages
│   │   ├── services
│   │   ├── styles
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# Requirements

Install the following before running the project.

- Git
- Node.js (v22 or above recommended)
- npm
- VS Code (Recommended)
- Google Cloud Console Account (OAuth2)

Verify installation:

```bash
node -v
npm -v
git --version
```

---

# Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Web-Portal.git
```

Go inside the project

```bash
cd Web-Portal
```

---

# Backend Setup

Open terminal

```bash
cd backend
```

Install dependencies

```bash
npm install
```

---

## Create .env File

Inside **backend** folder create

```
.env
```

Add:

```env
PORT=5000

JWT_SECRET=YOUR_SECRET_KEY

EMAIL_USER=

MAIL_FROM=

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

GOOGLE_REFRESH_TOKEN=
```

Replace all values with your own credentials.

---

## Install Puppeteer Browser

Run

```bash
npx puppeteer browsers install chrome
```

---

## Start Backend

```bash
npm run dev
```

Backend runs on

```
http://localhost:5000
```

---

# Frontend Setup

Open another terminal.

Go inside frontend

```bash
cd web-portal
```

Install dependencies

```bash
npm install
```

Run frontend

```bash
npm run dev
```

Frontend runs on

```
http://localhost:5173
```

---

# Running Complete Project

Open two terminals.

### Terminal 1

```bash
cd backend
npm run dev
```

### Terminal 2

```bash
cd web-portal
npm install
npm run dev
```

Open browser

```
http://localhost:5173
```

---

# Build Production Version

Frontend

```bash
cd web-portal

npm run build
```

Backend

```bash
cd backend

npm start
```

---

# Deployment

Frontend

- Vercel

Backend

- Render

Database and storage are local: `backend/data/*.json` and `backend/uploads`.

---

# Environment Variables

Backend

```
PORT
JWT_SECRET
EMAIL_USER
MAIL_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

---

# Workflow

```
Student Registration
        │
        ▼
Upload Documents
        │
        ▼
Generate Reference ID
        │
        ▼
Admin Login
        │
        ▼
Approve / Reject Student
        │
        ▼
Generate Offer Letter
        │
        ▼
Training Management
        │
        ▼
Generate Gyapan
        │
        ▼
Generate Certificate
```

---

# Common Issues

## npm install error

Delete

```
node_modules
package-lock.json
```

Run

```bash
npm install
```

---

## Puppeteer Error

Run

```bash
npx puppeteer browsers install chrome
```

---

## Local storage

Student and admin records are stored in `backend/data/students.json` and
`backend/data/admins.json`. Uploaded files are stored under `backend/uploads`.

---

## Email Not Sending

Verify

```
EMAIL_USER
MAIL_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

Restart backend after editing `.env`.

---

# Screenshots

You can add screenshots here.

- Home Page
- Student Registration
- Student Login
- Admin Dashboard
- Offer Letter
- Training Management
- Gyapan
- Certificates

---

# Author

**Naina Kharola**

B.Tech Student

Graphic Era University

---

# Acknowledgement

This project was developed as part of an internship project for **Defence Research and Development Organisation (DRDO)** to automate the complete internship registration and management process.


# Cheatsheet 
# DRDO Internship Registration & Management Portal

A full-stack web application developed for **Defence Research and
Development Organisation (DRDO)** to automate the complete internship
process, including student registration, admin approval, offer letter
generation, training management, Gyapan generation, and certificate
generation.

------------------------------------------------------------------------

## Features

### Student Module

-   Student Registration
-   Student Login using Email and Reference ID
-   Unique Reference ID Generation
-   Document Upload
-   Registration Confirmation Email
-   Download Offer Letter for Approved Students
-   View Application Status

### Admin Module

#### Authentication

-   Secure Admin Login
-   JWT Authentication
-   Protected Routes

#### Student Management

-   View All Students
-   Search Students
-   Filter Students
-   Approve / Reject Students
-   Delete Student Records

#### Offer Letter Module

-   Generate Offer Letter
-   Preview Offer Letter
-   Edit Offer Letter
-   Upload Offer Letter
-   Send Offer Letter by Email
-   PDF Generation using Puppeteer

#### Training Management System

-   Course Management
-   Branch Management
-   Year Management
-   Internship/Training Duration Management
-   Guide Details
-   Joining Status
-   Completion Status

#### Gyapan Module

-   Select Multiple Students
-   Preview Gyapan
-   Generate Official Gyapan
-   Download PDF
-   Automatic Removal After Generation

#### Certificate Module

-   Date-wise Filtering
-   Student Search
-   Generate Certificates
-   Individual PDF Download
-   Automatic Removal After Generation

------------------------------------------------------------------------

## Tech Stack

### Frontend

-   React.js
-   Vite
-   React Router DOM
-   CSS

### Backend

-   Node.js
-   Express.js
-   Local JSON files
-   JWT Authentication
-   Multer
-   Local uploads folder
-   Puppeteer
-   Nodemailer
-   Google OAuth2

------------------------------------------------------------------------

## Requirements

Install the following before running the project:

-   Git
-   Node.js v22 or above recommended
-   npm
-   VS Code recommended
-   Google Cloud Console account if Google OAuth2 email functionality is
    required

Verify installation:

``` bash
node -v
npm -v
git --version
```

------------------------------------------------------------------------

## Clone the Repository

``` bash
git clone https://github.com/NainaKharola/Web-App.git
cd Web-App
```

------------------------------------------------------------------------

## Project Structure

``` text
Web-App
│
├── backend
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── scripts
│   ├── services
│   ├── templates
│   ├── uploads
│   ├── package.json
│   └── server.js
│
├── web-portal
│   ├── public
│   ├── src
│   │   ├── assets
│   │   ├── components
│   │   ├── pages
│   │   ├── services
│   │   ├── styles
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

------------------------------------------------------------------------

# Backend Setup

Open a terminal in the project root:

``` bash
cd backend
npm install
```

### Create the Environment File

Inside the `backend` folder, create:

``` text
.env
```

Add:

``` env
PORT=5000

JWT_SECRET=YOUR_SECRET_KEY

EMAIL_USER=

MAIL_FROM=

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

GOOGLE_REFRESH_TOKEN=
```

Replace the values with your own credentials.

**Never commit `.env` to GitHub.**

### Install Puppeteer Browser

``` bash
npx puppeteer browsers install chrome
```

### Start the Backend

``` bash
npm run dev
```

Backend:

``` text
http://localhost:5000
```

------------------------------------------------------------------------

# Frontend Setup

Open a second terminal:

``` bash
cd web-portal
npm install
npm run dev
```

Frontend:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# Running the Complete Project

You need two terminals.

### Terminal 1: Backend

``` bash
cd Web-App/backend
npm install
npx puppeteer browsers install chrome
npm run dev
```

### Terminal 2: Frontend

``` bash
cd Web-App/web-portal
npm install
npm run dev
```

Open:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# Application Workflow

``` text
Student Registration
        │
        ▼
Upload Documents
        │
        ▼
Generate Reference ID
        │
        ▼
Admin Login
        │
        ▼
Approve / Reject Student
        │
        ▼
Generate Offer Letter
        │
        ▼
Training Management
        │
        ▼
Generate Gyapan
        │
        ▼
Generate Certificate
```

------------------------------------------------------------------------

# Production Build

### Frontend

``` bash
cd web-portal
npm run build
```

### Backend

``` bash
cd backend
npm start
```

------------------------------------------------------------------------

# Environment Variables

The backend uses:

``` env
PORT
JWT_SECRET
EMAIL_USER
MAIL_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

Restart the backend after changing `.env`.

------------------------------------------------------------------------

# Local Data and File Storage

The project uses local storage instead of a cloud database or cloud
media service.

Student and admin records are stored in:

``` text
backend/data/students.json
backend/data/admins.json
```

Uploaded files are stored under:

``` text
backend/uploads
```

Make sure the required data and upload directories exist before running
the application.

------------------------------------------------------------------------

# Common Issues and Troubleshooting

## npm install Error

If dependencies become corrupted, remove the dependency directory and
reinstall.

### Windows

``` bash
rmdir /s /q node_modules
del package-lock.json
npm install
```

### macOS/Linux

``` bash
rm -rf node_modules package-lock.json
npm install
```

Run the command inside the relevant `backend` or `web-portal` directory.

------------------------------------------------------------------------

## Puppeteer Error

Install the required browser:

``` bash
npx puppeteer browsers install chrome
```

Then restart the backend.

------------------------------------------------------------------------

## Backend Does Not Start

Check:

-   Node.js and npm are installed.
-   Backend dependencies are installed.
-   `backend/.env` exists.
-   Port `5000` is available.
-   Required JSON data files exist.

------------------------------------------------------------------------

## Frontend Does Not Start

``` bash
cd web-portal
npm install
npm run dev
```

Then open:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

## Email Not Sending

Verify:

``` env
EMAIL_USER
MAIL_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

Restart the backend after changing credentials.

------------------------------------------------------------------------

## PDF Generation Not Working

Check that:

1.  Puppeteer is installed.
2.  Chrome is installed:

``` bash
npx puppeteer browsers install chrome
```

3.  The backend is running.
4.  Required template files exist.
5.  The output directory is writable.

------------------------------------------------------------------------

## Uploaded Files Not Available

Verify that:

``` text
backend/uploads
```

exists and that the application has permission to write to it.

------------------------------------------------------------------------

# Deployment

## Frontend

Possible platform:

-   Vercel

## Backend

Possible platform:

-   Render

## Storage

The current application uses local storage:

``` text
backend/data/*.json
backend/uploads
```

When deploying, verify whether the hosting platform provides persistent
disk storage. Ephemeral storage may cause local JSON data and uploaded
files to be lost after restart or redeployment.

------------------------------------------------------------------------

# Screenshots

Suggested screenshots:

-   Home Page
-   Student Registration
-   Student Login
-   Admin Dashboard
-   Offer Letter
-   Training Management
-   Gyapan
-   Certificates

Example:

``` markdown
![Home Page](screenshots/home.png)
```

------------------------------------------------------------------------

# Author

**Naina Kharola**

B.Tech Student

Graphic Era University

------------------------------------------------------------------------

# Acknowledgement

This project was developed as part of an internship project for the
**Defence Research and Development Organisation (DRDO)** to automate the
complete internship registration and management process.
