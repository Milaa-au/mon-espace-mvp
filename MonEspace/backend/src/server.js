const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/auth.routes");
const boardRoutes = require("./routes/boards.routes");
const widgetRoutes = require("./routes/widgets.routes");
const planningEventRoutes = require("./routes/planning-events.routes");
const timerRoutes = require("./routes/timer.routes");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/widgets/:widgetId/events", planningEventRoutes);
app.use("/api/widgets/:widgetId/timer", timerRoutes);
app.use("/api/widgets", widgetRoutes);

app.get("/", (req, res) => {
    res.send("Mon serveur Express fonctionne !");
});

app.get("/api/message", (req, res) => {
    res.json({
        message: "Bonjour depuis le backend Node.js !",
    });
});

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});