const express = require("express");
const generateImage = require("./generate");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use("/images", express.static("images"));

app.post("/api/generate", async (req, res) => {
  console.log("📬 Richiesta ricevuta su /api/generate:", req.body);

  const { prompt, style, ratio } = req.body;

  try {
    const imageId = await generateImage(prompt, style, ratio);

    if (!imageId) {
      throw new Error("Nessun imageId restituito da generateImage()");
    }

    // Aggiorna gallery.json
    const record = {
      id: imageId,
      prompt,
      style,
      ratio,
      imagePath: `/images/${imageId}.jpg`,
      createdAt: new Date().toISOString()
    };

    const galleryPath = "gallery.json";
    const data = fs.existsSync(galleryPath)
      ? JSON.parse(fs.readFileSync(galleryPath))
      : [];

    data.push(record);
    fs.writeFileSync(galleryPath, JSON.stringify(data, null, 2));

    console.log("✅ Immagine registrata con ID:", imageId);
    res.json({ success: true, imageId });

  } catch (err) {
    console.error("❌ Errore API /generate:", err);
    res.status(500).json({
      success: false,
      error: "Errore durante la generazione",
      detail: err.message
    });
  }
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`✅ Backend attivo su http://localhost:${PORT}`)
);
