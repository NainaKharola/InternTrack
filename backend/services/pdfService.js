
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium").default || require("@sparticuz/chromium");

async function createBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const puppeteer = require("puppeteer-core");
    const chromium = require("@sparticuz/chromium");
    const executablePath = await chromium.executablePath();
    console.log("Using Chrome (prod):", executablePath);
    console.info("PUPPETEER LAUNCH", { environment: "production", executablePath });
    return puppeteer.launch({
      executablePath,
      headless: chromium.headless === false ? true : chromium.headless,
      args: [
        ...chromium.args,
        "--headless",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  } else {
    const puppeteer = require("puppeteer");
    const executablePath = await puppeteer.executablePath();
    console.info("PUPPETEER LAUNCH", { environment: "development", executablePath });
    return puppeteer.launch({
      headless: true,
      args: [
        "--headless=shell",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
      ],
    });
  }
}

async function renderPdf(browser, html) {
  console.info("PUPPETEER PAGE CREATE");
  const page = await browser.newPage();
  try {
    await page.setBypassCSP(true);
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });
    console.info("PUPPETEER HTML LOADED");
    await page.emulateMediaType("print");
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    console.info("PUPPETEER PDF GENERATED", { bytes: pdfBuffer.length });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

let browserInstance = null;
let browserPromise = null;

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  if (browserPromise) {
    return browserPromise;
  }

  browserPromise = createBrowser()
    .then((browser) => {
      browserInstance = browser;
      browserPromise = null;

      browser.once("disconnect", () => {
        console.log("Puppeteer browser disconnected. Clearing instance.");
        browserInstance = null;
      });

      return browserInstance;
    })
    .catch((err) => {
      browserPromise = null;
      throw err;
    });

  return browserPromise;
}

async function generatePdfsFromHtml(htmlDocuments) {
  try {
    const browser = await getBrowser();
    return await Promise.all(htmlDocuments.map((html) => renderPdf(browser, html)));
  } catch (error) {
    console.error("PUPPETEER ERROR", { message: error.message, stack: error.stack });
    throw error;
  }
}

async function generatePdfFromHtml(html) {
  const [pdf] = await generatePdfsFromHtml([html]);
  return pdf;
}

// Clean up Puppeteer instance on server exit
process.on("exit", () => {
  if (browserInstance) {
    browserInstance.close().catch(() => {});
  }
});

module.exports = { generatePdfFromHtml, generatePdfsFromHtml };
