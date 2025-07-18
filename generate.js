const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

module.exports = async function generateImage(prompt, style, ratio) {
  const email = process.env.IDEO_EMAIL;
  const password = process.env.IDEO_PASSWORD;

  console.log("🚀 Avvio generazione immagine con prompt:", prompt);
  console.log("🎨 Stile:", style, " | 🖼️ Proporzioni:", ratio);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    // Login
    console.log("🔐 Navigazione al login di Ideogram...");
    await page.goto("https://ideogram.ai/login", { waitUntil: "networkidle2" });

    console.log("✍️ Inserimento credenziali...");
    await page.type('input[type="email"]', email);
    await page.click("button[type='submit']");
    await page.waitForTimeout(2000);
    await page.type('input[type="password"]', password);
    await page.click("button[type='submit']");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("✅ Login effettuato");

    // Composizione prompt con stile e proporzioni
    let finalPrompt = prompt;
    if (style) finalPrompt += `, style: ${style}`;
    if (ratio) finalPrompt += `, aspect ratio: ${ratio}`;
    console.log("🧠 Prompt finale:", finalPrompt);

    // Vai alla home e inserisci il prompt
    await page.goto("https://ideogram.ai/", { waitUntil: "networkidle2" });
    console.log("📥 Inserimento prompt...");
    await page.waitForSelector("textarea");
    await page.type("textarea", finalPrompt);
    await page.keyboard.press("Enter");

    // Attendi generazione
    console.log("⏳ Attesa generazione immagine (circa 30 secondi)...");
    await page.waitForTimeout(30000);

    // Trova la prima immagine generata
    const imageElement = await page.$("img[src^='https://']");

    if (!imageElement) {
      throw new Error("❌ Nessuna immagine trovata dopo la generazione.");
    }

    const imageUrl = await page.evaluate(el => el.src, imageElement);
    console.log("🖼️ Immagine trovata:", imageUrl);

    // Scarica e salva immagine
    const viewSource = await page.goto(imageUrl);
    const id = uuidv4();
    const imagePath = path.join(__dirname, "images", `${id}.jpg`);
    fs.writeFileSync(imagePath, await viewSource.buffer());
    console.log("💾 Immagine salvata in:", imagePath);

    // Aggiungi info a gallery.json
    const galleryPath = path.join(__dirname, "gallery.json");
    let gallery = [];
    if (fs.existsSync(galleryPath)) {
      gallery = JSON.parse(fs.readFileSync(galleryPath));
    }
    gallery.push({
      id,
      prompt,
      style,
      ratio,
      image: `/images/${id}.jpg`,
      createdAt: new Date().toISOString()
    });
    fs.writeFileSync(galleryPath, JSON.stringify(gallery, null, 2));
    console.log("📚 gallery.json aggiornato");

    await browser.close();

    return id;

  } catch (err) {
    console.error("❌ Errore durante la generazione dell'immagine:", err);
    await browser.close();
    throw err;
  }
};
