const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        // Récupération du header Authorization
        const authHeader = req.headers.authorization;

        // Vérification de la présence du token
        if (!authHeader) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        // Vérification du format : Bearer TOKEN
        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                message: "Invalid authorization format"
            });
        }

        const token = parts[1];

        // Vérification du JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // On garde les informations de l'utilisateur
        // disponibles pour la route suivante
        req.user = decoded;

        // On continue vers la route
        next();

    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;
