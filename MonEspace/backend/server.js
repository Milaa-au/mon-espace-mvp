const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Mon serveur Express fonctionne !");
});

app.get("/api/message", (req, res) => {
  res.json({
    message: "Bonjour depuis le backend Node.js !"
  });
});

app.listen(5000, () => {
  console.log("Serveur lancé sur http://localhost:5000");
});