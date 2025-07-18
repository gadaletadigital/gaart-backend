/**
 * generate.js - versione Playwright
 * Login su Ideogram, generazione immagine da prompt, salvataggio locale.
 *
 * NOTE:
 * - DOM di Ideogram può cambiare: aggiorna i selettori se necessario.
 * - Il "ratio" e "style" vengono applicati nel testo del prompt come fallback.
 *   Se vuoi cliccare bottoni UI specifici di Ideogram, vedi TODO più sotto.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function generateImage(prompt, style, ratio) {
  const email = process.env.IDEO_EMAIL;
  const password = process.env.IDEO_PASSWORD;

  if (!email || !password) {
    throw new Error("Credenziali Ideogram mancanti. Configura IDEO_EMAIL e IDEO_PASSWORD.");
  }

  console.log("🚀 [generate] Avvio generazione:");
  console.log("   Prompt:", prompt);
  console.log("   Style :", style);
  console.log("   Ratio :", ratio);

  // Avvia browser
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // LOGIN ----------------------------------------------------------
    console.log("🔐 Navigazione login Ideogram...");
    await page.goto("https://ideogram.ai/login", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Email
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');

    // Password
    await page.waitForSelector('input[type="password"]', { timeout: 30000 });
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Attendi arrivo dashboard/home
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    console.log("✅ Login riuscito.");

    // GOTO HOME -------------------------------------------------------
    // (spesso dopo login sei già lì, ma per sicurezza)
    await page.goto("https://ideogram.ai/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // PREPARA PROMPT --------------------------------------------------
    // Fallback: includi style e ratio nel testo, finché non automatizzi i menu
    let finalPrompt = prompt;
    if (style) finalPrompt += `, style: ${style}`;
    if (ratio) finalPrompt += `, aspect ratio: ${ratio}`;
    console.log("🧠 Prompt finale inviato:", finalPrompt);

    // Trova textarea input
    await page.waitForSelector("textarea", { timeout: 30000 });
    await page.fill("textarea", finalPrompt);

    // TODO (opzionale): selezionare lo stile o il ratio dall'interfaccia
    // Esempio (placeholder, aggiornare con selettori reali):
    // await page.click('[data-style="fantasy"]');
    // await page.click('[data-ratio="7:10"]');

    // INVIA GENERAZIONE -----------------------------------------------
    await page.keyboard.press("Enter");
    console.log("⏳ Generazione avviata...");

    // Aspetta che compaiano risultati: cerca contenitore immagini generazione
    // Ideogram genera più thumbnail; cerchiamo il primo <img> CDN dopo un po'.
    const imageSelector = 'img[src^="https://"]';
    await page.waitForSelector(imageSelector, { timeout: 60000 });
    console.log("🖼️ Risultato trovato a schermo.");

    // Prendi la prima immagine valida
    const imageUrl = await page.$eval(imageSelector, el => el.src);
    console.log("🔗 URL immagine:", imageUrl);

    // SCARICA ---------------------------------------------------------
    const response = await page.goto(imageUrl);
    if (!response || !response.ok()) {
      throw new Error("Download immagine fallito.");
    }

    // Assicurati che la cartella esista
    const imagesDir = path.join(__dirname, "images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const id = uuidv4();
    const outPath = path.join(imagesDir, `${id}.jpg`);
    const buffer = await response.body();
    fs.writeFileSync(outPath, buffer);
    console.log("💾 Immagine salvata:", outPath);

    await browser.close();
    return id;

  } catch (err) {
    console.error("❌ [generate] Errore:", err);
    await browser.close();
    throw err;
  }
}

module.exports = generateImage;
