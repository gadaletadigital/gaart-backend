const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function generateImage(prompt, style, ratio, imageId) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://ideogram.ai/login", { waitUntil: "networkidle2" });

    // Login
    await page.type('input[type="email"]', process.env.IDEO_EMAIL);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    await page.type('input[type="password"]', process.env.IDEO_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Inserimento prompt
    const fullPrompt = `${prompt} --style ${style} --ar ${ratio}`;
    await page.waitForSelector('textarea');
    await page.type('textarea', fullPrompt);
    await page.keyboard.press('Enter');

    // Aspetta generazione immagine
    await page.waitForTimeout(30000);

    // Trova immagine
    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src^="https://cdn.ideogram.ai"]');
      return img ? img.src : null;
    });

    if (!imageUrl) throw new Error("Nessuna immagine trovata");

    const view = await page.goto(imageUrl);
    const buffer = await view.buffer();

    const imgPath = path.join(__dirname, 'images', `${imageId}.jpg`);
    fs.writeFileSync(imgPath, buffer);

    await browser.close();
    return `/images/${imageId}.jpg`;
  } catch (error) {
    console.error("Errore:", error);
    await browser.close();
    return null;
  }
}

module.exports = generateImage;
