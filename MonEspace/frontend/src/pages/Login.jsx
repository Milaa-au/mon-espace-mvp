import { useState } from "react";

function Login() {
    const [formData, setFormData] = useState({
        identifier: "",
        password: ""
    });

    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/login",
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

                setMessage("Connexion réussie ✅");

                console.log(data);
            } else {
                setMessage(data.message);
            }

        } catch (error) {
            setMessage("Erreur serveur");
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
                    Se connecter
                </button>
            </form>

            <p>{message}</p>
        </div>
    );
}

export default Login;