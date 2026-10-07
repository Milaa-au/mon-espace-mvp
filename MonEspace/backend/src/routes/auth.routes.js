// Récupération de Express
const express = require("express");

// Récupération de bcrypt
const bcrypt = require("bcrypt");

// Récupération de la connexion PostgreSQL
const pool = require("../db/connection");

// Création d'un router pour regrouper nos routes d'authentification
const router = express.Router();

// Route pour l'inscription
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Vérification des champs obligatoires
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All required fields"
            });
        }

        // Vérification du format de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email address"
            });
        }

        // Vérification de la longueur du username
        if (username.length < 3) {
            return res.status(400).json({
                message: "The username must contain at least 3 characters"
            });
        }

        // Vérification de la longueur du mot de passe
        if (password.length < 8) {
            return res.status(400).json({
                message: "The password must be at least 8 characters long"
            });
        }

        // Vérification si l'email existe déjà
        const emailCheck = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (emailCheck.rows.length > 0) {
            return res.status(409).json({
                message: "This email is already in use"
            });
        }

        // Vérification si le username existe déjà
        const usernameCheck = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );

        if (usernameCheck.rows.length > 0) {
            return res.status(409).json({
                message: "This username is already in use"
            });
        }

        // Hash du mot de passe
        const passwordHash = await bcrypt.hash(password, 10);

        // Création de l'utilisateur
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email`,
            [username, email, passwordHash]
        );

        // Retour de succès
        return res.status(201).json({
            message: "Account created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.post("/login", (req, res) => {
    console.log(req.body);

    res.json({
        message: "The connection is working properly"
    });
});


// Export du router
module.exports = router;