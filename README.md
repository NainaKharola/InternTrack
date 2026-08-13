# Web Portal – Internship Management System

A full-stack internship management portal for managing student registration, approval, division allocation, certificates, ISM letters, student joining/completion, and quarterly reports for Paid and Unpaid internships.

## Main Features

### Student Portal
- Paid and Unpaid internship registration
- Student login using registered email and Reference ID
- Automatic unique Reference ID
- Personal, academic, college and internship information
- Gender information
- Document uploads
- Approval/status tracking
- Offer letter access for approved students
- Certificate access
- Paid Internship Project Details
- Bank details for Paid students:
  - Bank Name
  - Saving A/c No.
  - IFSC
- First and Second Quarter Reports
  - From Date
  - To Date
  - No. of Days Present
- Quarter date range validation
- Paid project details are optional and editable by the student

### Paid Internship Project Details
After approval, Paid students can edit only:
1. Name of Project
2. Title of Designation
3. Name of Supervisor
4. Name & PDC of the Project in which Working
5. Achievements

All five fields are optional.

## Admin Portal

The admin panel supports:
- Student management
- Approval/rejection
- Student details
- Search and filtering
- Division/branch assignment
- Paid/Unpaid seat allocation
- Certificates
- ISM letters
- Quarterly reports
- System configuration
- Joining and completion management
- Offer letters

### Approved Students

`/admin/approved-students` displays approved students only.

Status filters:
- All Students
- Completed
- Not Completed

Completed means:
`Completed Status = Yes`

Not Completed means:
`Completed Status != Yes`

Pending and Rejected students are not displayed on this page.

## Paid / Unpaid Seat Allocation

Paid and Unpaid seats are calculated independently.

For each Division + Branch:

```text
Total Capacity = Paid Capacity + Unpaid Capacity

Paid Available = Paid Capacity - Paid Used
Unpaid Available = Unpaid Capacity - Unpaid Used
```

A Paid student consumes only Paid seats.

An Unpaid student consumes only Unpaid seats.

Example:

```text
ABS
Paid Capacity   = 10
Unpaid Capacity = 20

Paid Used       = 8
Unpaid Used     = 20

Paid Available  = 2
Unpaid Available = 0
```

A Paid student can still use ABS, while an Unpaid student cannot.

The same logic is used for division suggestion, assignment, branch allocation, vacancy calculation and full-seat validation.

If a new assignment is invalid or full, the student's previous valid assignment remains unchanged.

## Certificates

The portal supports:
- Paid Internship Certificate
- Unpaid Internship Certificate

Certificate data includes student details, institute information, training dates, project information and generation date.

Default authorized officer:

```text
(VAIBHAV GUPTA)
TECHNICAL OFFICER 'C'
for Director
```

The admin can temporarily edit the Name and Designation. `for Director` always remains unchanged.

## ISM Letter

The ISM letter uses:
- Student name
- Year
- Course/Branch
- College name
- College location
- From date
- To date
- Automatically generated date

## Quarterly Reports

Quarterly Reports are for Paid Internship students.

They contain:

### Proforma for Quarterly Report
The report uses the DRDO Paid Internship quarterly report format and automatically uses student information such as:
- Name
- Course/Branch/Discipline
- Gender
- Date of Birth
- Joining date
- Project details
- Supervisor
- Achievements
- Completion date
- Resignation date
- Remarks

Paid students whose Completed Status is `Yes` are removed from the active quarterly report list.

### Attendance Reports
There are:
- First Quarter Report
- Second Quarter Report

Attendance reports contain:
- Student Name
- Period
- No. of Present Days
- Bank Name
- Saving A/c No.
- IFSC

Student bank details are shared with both reports, while each quarter keeps its own From Date and To Date.

A quarter cannot exceed 95 days.

Reports support:
- Download Excel
- Download PDF
- Print

## Student Joining and Completion

Admins can manage joining and completion details.

Completion status is used by:
- Approved Student filters
- Quarterly Reports
- Internship completion tracking

Resignation is stored separately:

```text
Resignation: Yes / No
```

If Resignation is `Yes`, a resignation date is required.
If Resignation is `No`, no resignation date is required.

## Technology Stack

### Frontend
- React
- JavaScript / TypeScript
- Vite
- CSS

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- MongoDB
- Mongoose

### Storage
- Cloudinary

### PDF
- Puppeteer

### Email
- Nodemailer
- Gmail OAuth2

### Deployment
- Vercel
- Render
- MongoDB Atlas
- Cloudinary

## Typical Project Structure

```text
Web-Portal/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── templates/
│   ├── server.js
│   └── package.json
│
└── README.md
```

The exact structure may differ depending on the current project version.

## Environment Variables

Create `backend/.env` with the required values, for example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

EMAIL_USER=your_email
MAIL_FROM=your_email

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

Never commit `.env` or secrets to GitHub.

## Installation

### Backend

```bash
cd backend
npm install
node server.js
```

Backend normally runs on:

```text
http://localhost:5000
```

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend normally runs on:

```text
http://localhost:5173
```

## Common Backend Port Error

If you see:

```text
Error: listen EADDRINUSE: address already in use :::5000
```

find the process:

```powershell
netstat -ano | findstr :5000
```

Then terminate it:

```powershell
taskkill /PID <PID> /F
```

Start the backend again:

```powershell
node server.js
```

## Important Development Rules

- Reuse existing database fields whenever possible.
- Do not create duplicate fields for information already stored.
- Paid and Unpaid seat calculations must remain independent.
- Backend validation must enforce seat limits.
- Do not overwrite a valid division/branch when a new invalid assignment fails.
- Keep existing certificate templates and PDF generation intact.
- Treat the explicit Completed Status as the source of truth.
- Keep sensitive credentials in environment variables.

## Security

Never commit:
- `.env`
- Database credentials
- Cloudinary secrets
- Google OAuth credentials
- JWT secrets
- Refresh tokens
- Passwords

## License

This project is intended for internship management and administrative use.
