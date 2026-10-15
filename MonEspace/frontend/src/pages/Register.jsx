import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: ""
    });

    const [message, setMessage] = useState("");
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
            `${API_URL}/api/auth/register`,
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
                navigate("/login?registered=1", { replace: true });
            } else {
                setMessage(data.message || "Inscription impossible.");
            }

        } catch (error) {
            setMessage("Erreur serveur");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h1>Inscription</h1>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="username"
                    placeholder="Nom d'utilisateur"
                    value={formData.username}
                    onChange={handleChange}
                />

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
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
                    {isSubmitting ? "Création..." : "S'inscrire"}
                </button>
            </form>

            <p>{message}</p>
        </div>
    );
}

export default Register;