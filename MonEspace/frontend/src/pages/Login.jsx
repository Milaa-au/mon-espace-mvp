import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../api.js";

function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        identifier: "",
        password: ""
    });

    const [message, setMessage] = useState(
        searchParams.get("registered") === "1" ? "Compte créé. Connecte-toi." : ""
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setIsSubmitting(true);
        setMessage("");

        try {
            const response = await fetch(
            `${API_URL}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                }
            );

            const data = await response.json();

            if (response.ok) {

                // Sauvegarde du JWT
                localStorage.setItem("token", data.token);

                navigate("/dashboard", { replace: true });
            } else {
                setMessage(data.message || "Connexion impossible.");
            }

        } catch (error) {
            setMessage("Erreur serveur");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h1>Connexion</h1>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="identifier"
                    placeholder="Email ou username"
                    value={formData.identifier}
                    onChange={handleChange}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Mot de passe"
                    value={formData.password}
                    onChange={handleChange}
                />

                <button type="submit">
                    {isSubmitting ? "Connexion..." : "Se connecter"}
                </button>
            </form>

            <p>{message}</p>
        </div>
    );
}

export default Login;