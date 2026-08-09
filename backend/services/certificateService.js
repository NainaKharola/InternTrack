const fs = require("fs");
const path = require("path");

const logoPath = path.join(__dirname, "..", "templates", "irde_logo.jpg");
const logoUrl = fs.existsSync(logoPath)
    ? `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`
    : "";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function certificateFileName(student) {
    const refId = student.referenceId || "UNKNOWN";
    const nameNoSpaces = (student.name || "Student").replace(/\s+/g, "");

    return `Certificate_${refId}_${nameNoSpaces}.pdf`;
}

function generateCertificateHtml(student, renderMode = "full", signatureName = "VAIBHAV GUPTA", signatureDesignation = "TECHNICAL OFFICER 'C'") {
    const training = student.trainingManagement || {};
    const isPaid = String(student.internshipType || "").trim().toLowerCase() === "paid";

    const fromDate = formatDate(training.fromDate);
    const toDate = formatDate(training.toDate);
    const issuedDate = formatDate(new Date());

    const studentNameClass = `${(student.name || "").toUpperCase()} (${(student.course || "").toUpperCase()} ${(student.year || "").toUpperCase()}, ${(student.branch || "").toUpperCase()})`;
    const instituteName = training.collegeName || student.collegeName || "";
    const instituteLocation = training.collegeLocation || student.location || student.collegeAddress || "";
    const collegeNameAddress = `${instituteName.toUpperCase()}${instituteLocation ? `, ${instituteLocation.toUpperCase()}` : ""}`;

    const perf = (training.leaveAvailed || training.performance || "").trim().toLowerCase();

    let checkOutstanding = "";
    let checkVeryGood = "";
    let checkGood = "";
    let checkAverage = "";

    if (perf.includes("outstanding")) {
        checkOutstanding = "✔";
    } else if (perf.includes("very good") || perf.includes("verygood")) {
        checkVeryGood = "✔";
    } else if (perf.includes("good") && !perf.includes("very")) {
        checkGood = "✔";
    } else if (perf.includes("average")) {
        checkAverage = "✔";
    }

    const projectTitle = (training.projectTitle || "").trim();
    const detailsHtml = projectTitle ? escapeHtml(projectTitle.toUpperCase()) : "";

    const bannerHtml = isPaid
        ? `<h2>CERTIFICATE OF STUDENT'S INTERNSHIP</h2>
       <p>(Under Paid Internship Program)</p>`
        : `<h2>CERTIFICATE OF STUDENT'S INTERNSHIP</h2>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Student's Internship - IRDE DRDO</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: "Times New Roman", Times, serif;
            background-color: ${renderMode === "template" ? "transparent" : "#f0f0f0"};
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;
            width: 210mm;
            height: 297mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .certificate-container {
            width: 210mm;
            height: 297mm;
            background-color: #ffffff;
            border: none;
            padding: 40px 50px 30px 50px;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* Faded Emblem Watermark in Background */
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -35%);
            width: 680px;
            height: 680px;
            opacity: 0.10;
            pointer-events: none;
            background-image: ${renderMode === "template" ? "none" : `url('${logoUrl}')`};
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 0;
        }

        /* Content layer */
        .certificate-content {
            position: relative;
            z-index: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* Header Layout */
        .header {
            display: flex;
            align-items: flex-start;
            margin-bottom: 18px;
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }

        .logo-container {
            width: 140px;
            flex-shrink: 0;
            text-align: center;
        }

        .logo {
            width: 130px;
            height: 130px;
            object-fit: contain;
        }

        .header-text {
            flex-grow: 1;
            text-align: center;
            padding-right: 20px;
        }

        /* Top Line Header */
        .header-text h1 {
            font-family: 'Charter', 'Bitstream Charter', 'Sitka Banner', Georgia, serif;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            color: #000;
            text-shadow: 0.3px 0 0 #000, -0.3px 0 0 #000;
        }

        .header-text h2 {
            font-size: 17px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            color: #000;
        }

        .header-text h3 {
            font-size: 17px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            color: #000;
        }

        .header-text p.address {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            color: #000;
        }

        .header-text p.contact {
            font-size: 13px;
            font-weight: bold;
            word-spacing: 1px;
        }

        /* Star Divider */
        .star-divider {
            text-align: center;
            position: relative;
            margin: 18px 0;
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }

        .star-divider::before,
        .star-divider::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 42%;
            height: 1px;
            background-color: #888;
        }

        .star-divider::before { left: 0; }
        .star-divider::after { right: 0; }

        .star-divider .star {
            color: #0c2340;
            font-size: 16px;
            vertical-align: middle;
        }

        /* Clean Rectangle Banner without side triangle wings */
        .banner {
            background-color: #0b2240;
            color: #ffffff;
            text-align: center;
            padding: 8px 10px;
            border-top: 2px solid #b89753;
            border-bottom: 2px solid #b89753;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            margin-bottom: 18px;
            width: 100%;
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }

        .banner h2 {
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }

        .banner p {
            font-size: 15px;
            font-weight: normal;
        }

        /* Form Layout */
        .form-section {
            font-size: 15px;
            line-height: 1.6;
            color: #000;
        }

        .grid-form {
            display: grid;
            grid-template-columns: 320px 20px 1fr;
            row-gap: 18px;
            align-items: baseline;
            margin-bottom: 18px;
        }

        .grid-form .label {
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }
        .grid-form .colon {
            text-align: center;
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }
        .grid-form .value {
            font-weight: bold;
        }

        .box-container {
            margin: 10px 0 20px 0;
        }

        .details-box {
            width: 100%;
            height: 110px;
            border: ${renderMode === "template" ? "none" : "1.5px solid #0b2240"};
            border-radius: 8px;
            background-color: ${renderMode === "template" ? "transparent" : "rgba(255, 255, 255, 0.7)"};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            padding: 10px;
            text-align: center;
        }

        .performance-section {
            margin-top: 15px;
            margin-bottom: 40px;
        }

        .performance-section .label {
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }

        .options-grid {
            display: flex;
            justify-content: space-between;
            padding: 10px 20px 0 30px;
        }

        .option-item {
            display: flex;
            align-items: center;
            font-size: 15px;
        }

        .checkbox-custom {
            width: 16px;
            height: 16px;
            border: 1px solid #333;
            margin-left: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #fff;
            font-weight: bold;
            font-size: 14px;
        }

        /* Footer */
        .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 30px;
            padding-bottom: 10px;
        }

        .dated-row {
            display: grid;
            grid-template-columns: 50px 20px 1fr;
            align-items: center;
            font-size: 15px;
            width: 200px;
        }

        .dated-row span:not(.date-val) {
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }

        .signature-block {
            text-align: center;
            width: 240px;
        }

        .signature-line {
            border-top: 1px solid #000;
            margin-bottom: 6px;
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }

        .signature-block .name {
            font-size: 14px;
            font-weight: bold;
        }

        .signature-block .title {
            font-size: 13px;
            font-weight: bold;
        }

        .signature-block .sub-title {
            font-size: 13px;
        }

        .system-generated {
            text-align: center;
            font-style: italic;
            font-size: 12px;
            margin-top: 25px;
            color: #333;
            visibility: ${renderMode === "template" ? "hidden" : "visible"};
        }

        @media print {
            body {
                background-color: transparent;
            }
            .certificate-container {
                width: 210mm;
                height: 297mm;
                padding: 40px 50px 30px 50px;
            }
        }
    </style>
</head>
<body>

    <div class="certificate-container">
        <!-- Background Watermark -->
        <div class="watermark"></div>

        <div class="certificate-content">
            <div class="header-group">
                <!-- Header Section -->
                <div class="header">
                    <div class="logo-container">
                        <img src="${logoUrl}" alt="DRDO Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display:none; width:100px; height:100px; border-radius:50%; border:2px solid #0c2340; margin:0 auto; font-size:10px; padding-top:30px;">[ DRDO LOGO ]</div>
                    </div>
                    <div class="header-text">
                        <h1>INSTRUMENTS R&D ESTABLISHMENT</h1>
                        <h2>GOVT. OF INDIA, MINISTRY OF DEFENCE</h2>
                        <h3>DEFENCE R & D ORGANISATION</h3>
                        <p class="address">RAIPUR ROAD, DEHRADUN - 248 008</p>
                        <p class="contact">Phones : 0135-2787004 to 2787007 &nbsp;|&nbsp; Fax : 0091-135-2787161 & 2787128</p>
                    </div>
                </div>

                <div class="star-divider">
                    <span class="star">★</span>
                </div>

                <!-- Banner without side triangles -->
                <div class="banner">
                    ${bannerHtml}
                </div>
            </div>

            <!-- Form Body -->
            <div class="form-section">
                <div class="grid-form">
                    <span class="label">1. Name of Student & Class</span>
                    <span class="colon">:</span>
                    <span class="value">${escapeHtml(studentNameClass)}</span>

                    <span class="label">2. Name of Institute</span>
                    <span class="colon">:</span>
                    <span class="value">${escapeHtml(collegeNameAddress)}</span>

                    <span class="label">3. Date of Commencement of Training</span>
                    <span class="colon">:</span>
                    <span class="value">${escapeHtml(fromDate)}</span>

                    <span class="label">4. Date of Completion of Training</span>
                    <span class="colon">:</span>
                    <span class="value">${escapeHtml(toDate)}</span>
                </div>

                <div style="margin-bottom: 5px;">
                    <span class="label">5. Brief Details of Training (Nature of Training / Project Taken up, if any):</span>
                </div>

                <div class="box-container">
                    <div class="details-box">${detailsHtml}</div>
                </div>

                <div class="performance-section">
                    <div style="margin-bottom: 10px;">
                        <span class="label">6. Overall Performance of Student during Training:</span>
                    </div>
                    <div class="options-grid">
                        <div class="option-item">
                            <span>Outstanding</span>
                            <span class="checkbox-custom">${checkOutstanding}</span>
                        </div>
                        <div class="option-item">
                            <span>Very Good</span>
                            <span class="checkbox-custom">${checkVeryGood}</span>
                        </div>
                        <div class="option-item">
                            <span>Good</span>
                            <span class="checkbox-custom">${checkGood}</span>
                        </div>
                        <div class="option-item">
                            <span>Average</span>
                            <span class="checkbox-custom">${checkAverage}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Section -->
            <div class="footer-section">
                <div class="dated-row">
                    <span>Dated</span>
                    <span class="colon">:</span>
                    <span class="date-val">${escapeHtml(issuedDate)}</span>
                </div>
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="name">(${escapeHtml(signatureName.toUpperCase())})</div>
                    <div class="title">${escapeHtml(signatureDesignation.toUpperCase())}</div>
                    <div class="sub-title">for Director</div>
                </div>
            </div>

            <div class="system-generated">
                Generated by: Training Management System, IRDE, Dehradun
            </div>
        </div>
    </div>

</body>
</html>`;

    console.info("CERTIFICATE HTML GENERATED", { studentId: student._id, length: html.length });
    return html;
}

module.exports = { certificateFileName, generateCertificateHtml };
