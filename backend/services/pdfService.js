
const puppeteer = require("puppeteer");

async function getChromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  try {
    return await puppeteer.executablePath();
  } catch (err) {
    return "bundled Chromium";
  }
}

async function checkChromiumPath() {
  const chromiumPath = await getChromiumPath();
  const source = process.env.PUPPETEER_EXECUTABLE_PATH ? "custom (PUPPETEER_EXECUTABLE_PATH)" : "bundled";
  console.log(`🌐 Chromium path in use (${source}): ${chromiumPath}`);
  return chromiumPath;
}

async function createBrowser() {
  const options = {
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  return puppeteer.launch(options);
}

async function renderPdf(browser, html) {
  console.info("PUPPETEER PAGE CREATE");
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(30000);
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 30000,
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
      timeout: 30000,
    });
    console.info("PUPPETEER PDF GENERATED", { bytes: pdfBuffer.length });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

async function generatePdfsFromHtml(htmlDocuments) {
  let browser;
  try {
    browser = await createBrowser();
    return await Promise.all(htmlDocuments.map((html) => renderPdf(browser, html)));
  } catch (error) {
    console.error("PUPPETEER ERROR", { message: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      console.info("PUPPETEER BROWSER CLOSED");
    }
  }
}

async function generatePdfFromHtml(html) {
  const [pdf] = await generatePdfsFromHtml([html]);
  return pdf;
}

module.exports = { checkChromiumPath, generatePdfFromHtml, generatePdfsFromHtml };
