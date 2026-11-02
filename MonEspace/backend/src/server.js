const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/auth.routes");
const boardRoutes = require("./routes/boards.routes");
const widgetRoutes = require("./routes/widgets.routes");
const planningEventRoutes = require("./routes/planning-events.routes");
const timerRoutes = require("./routes/timer.routes");

const localOrigins = process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://127.0.0.1:5173"];
const configuredOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
    .filter(Boolean)
    .flatMap((origins) => origins.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = new Set([...localOrigins, ...configuredOrigins]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by CORS"));
    },
}));
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