const express = require("express");
const generateImage = require("./generate");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use("/images", express.static("images"));

app.post("/api/generate", async (req, res) => {
  const { prompt, style, ratio } = req.body;
  const imageId = uuidv4();

  const imagePath = await generateImage(prompt, style, ratio, imageId);

  if (imagePath) {
    const record = { id: imageId, prompt, style, ratio, imagePath };
    const data = fs.existsSync("gallery.json") ? JSON.parse(fs.readFileSync("gallery.json")) : [];
    data.push(record);
    fs.writeFileSync("gallery.json", JSON.stringify(data, null, 2));

    res.json({ success: true, imageId });
  } else {
    res.status(500).json({ success: false, error: "Errore nella generazione." });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));
