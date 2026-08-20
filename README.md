# Web Portal – Student Internship Management System

## Overview

Web Portal is a full-stack web application for managing student internship registrations and administrative workflows at Instruments Research & Development Establishment (IRDE), DRDO.

---

## Technical Features & Architectural Highlights

### 🛡️ Hardened Session Security (HttpOnly Cookies)
All authentication tokens (for both administrative console and student login sessions) are transmitted and verified using secure, backend-configured **HttpOnly cookies**. This completely shields JWT tokens from cross-site scripting (XSS) attacks. The React frontend is equipped with a global interceptor that handles automated credentials attachment (`credentials: "include"`) for all asynchronous fetch operations.

### 🗄️ Relational Database (PostgreSQL)
The application metadata layer runs on **PostgreSQL**.
* Custom abstractions store data schemas securely inside optimized JSONB structures.
* High-performance indices are automatically created on startup for critical nested parameters (`email`, `status`, `referenceId`) to avoid full table scans.

### 📦 S3-Compatible File Storage (MinIO)
All uploaded files (student photos, Aadhaar cards, resumes, permission letters, and completed documents) are stored inside a dedicated **MinIO** S3 bucket.
* The system performs bucket readiness and connectivity checks on server startup.
* If the bucket is missing, it is dynamically created.
* Uploaded files are organised under prefix namespaces using the student's unique `referenceId`.

### ✏️ Sequential Certificate Numbering
A sequential numbering mechanism is integrated into the internship certificate generator:
* Starting/next sequence number is manually editable under **System Configuration** (`/admin/system-configuration`).
* The sequence allocation is fully transaction-safe and uses row-level database locks (`SELECT ... FOR UPDATE`) in PostgreSQL to avoid race conditions.
* Re-downloading or editing an existing certificate does not consume a new number, preventing holes or overlaps in the sequencing.

---

## Technology Stack

### Frontend
* React.js (built with Vite)
* JavaScript / JSX
* Pure CSS

### Backend
* Node.js / Express
* PostgreSQL (driver: `pg`)
* MinIO / AWS S3 SDK (`@aws-sdk/client-s3`)
* Cookie Parser (`cookie-parser`)

### Document Generation
* Puppeteer (for rendering dynamic HTML certificates, joining ISM gyapans, and offer letters on-the-fly)

---

## Installation & Local Development

### 1. Clone the repository
```bash
git clone <repository-url>
cd Web-Portal
```

### 2. Configure environment variables
Create a `.env` file inside the `backend` directory:
```env
PORT=5000
JWT_SECRET=your_jwt_secret

# Database Configuration
PGUSER=postgres
PGHOST=localhost
PGDATABASE=Webportal
PGPASSWORD=your_postgres_password
PGPORT=5432

# MinIO Storage Settings
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=webportal
```

### 3. Start Backend Development Server
```bash
cd backend
npm install
npm run dev
```
On startup, the console will print:
```bash
🚀 Server running on port 5000
✅ MinIO connected
✅ MinIO bucket ready: webportal
✅ PostgreSQL connected
Creating database indexes if not exist...
✅ Database indexes ready
```

### 4. Start Frontend
```bash
cd ../web-portal
npm install
npm run dev
```
The application will launch on **`http://localhost:5173`**.

---

## Key Administration Paths
* **`http://localhost:5173/admin/dashboard`**: Main Admin Console dashboard.
* **`http://localhost:5173/admin/system-configuration`**: Page to configure seat capacities, edit division categories, and set the **Starting/Next Certificate Number**.
* **`http://localhost:5173/admin/certificates`**: Batch download, print, or edit authorized signature configurations for student internship certificates.

