const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function generateImage(prompt, style, ratio, imageId) {
  console.log("🚀 [generate] Avvio generazione:");
  console.log("   Prompt:", prompt);
  console.log("   Style :", style);
  console.log("   Ratio :", ratio);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("🌍 Navigazione verso Ideogram...");
    await page.goto("https://ideogram.ai/login", { waitUntil: "networkidle" });

    // Screenshot per debug
    await page.screenshot({ path: "public/debug_login.png", fullPage: true });

    console.log("👁️ Attesa campo email...");
    await page.waitForSelector('input[type="email"]', { timeout: 60000 });

    console.log("🔐 Login...");
    await page.fill('input[type="email"]', process.env.IDEOGRAM_EMAIL);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000); // attesa breve per la redirezione

    console.log("🧠 Navigazione pagina di generazione...");
    await page.goto("https://ideogram.ai/generate", { waitUntil: "networkidle" });

    console.log("✍️ Inserimento prompt e opzioni...");
    await page.fill('textarea[placeholder="Describe your image"]', prompt);
    await page.selectOption('select[name="style"]', style);
    await page.selectOption('select[name="ratio"]', ratio);

    await page.click('button:has-text("Generate")');
    await page.waitForSelector('img.generated-image', { timeout: 60000 });

    const imageUrl = await page.getAttribute('img.generated-image', 'src');

    if (!imageUrl) throw new Error("URL immagine non trovato");

    console.log("💾 Download immagine:", imageUrl);
    const imageBuffer = await page.evaluate(async (url) => {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsArrayBuffer(blob);
      });
    }, imageUrl);

    const outputPath = path.join("images", `${imageId}.jpg`);
    fs.writeFileSync(outputPath, Buffer.from(imageBuffer));

    await browser.close();
    return outputPath;
  } catch (error) {
    console.error("❌ [generate] Errore:", error);
    await browser.close();
    return null;
  }
}

module.exports = generateImage;
