const { generatePdfFromHtml } = require("./services/pdfService");
(async () => {
  try {
    console.log("Generating test PDF...");
    const pdf = await generatePdfFromHtml("<h1>Hello World</h1>");
    console.log("PDF generated successfully! Length:", pdf.length);
    process.exit(0);
  } catch (err) {
    console.error("Error generating PDF:", err);
    process.exit(1);
  }
})();
