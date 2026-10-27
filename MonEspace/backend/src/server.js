const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/auth.routes");
const boardRoutes = require("./routes/boards.routes");
const widgetRoutes = require("./routes/widgets.routes");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/widgets", widgetRoutes);

app.get("/", (req, res) => {
    res.send("Mon serveur Express fonctionne !");
});

app.get("/api/message", (req, res) => {
    res.json({
        message: "Bonjour depuis le backend Node.js !",
    });
});

app.listen(5000, () => {
    console.log("Serveur lancé sur http://localhost:5000");
});