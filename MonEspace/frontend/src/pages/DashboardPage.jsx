import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";

function DashboardPage() {
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch(`${API_URL}/api/boards`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Chargement impossible.");
                setBoard(data.board);
            })
            .catch((requestError) => setError(requestError.message));
    }, []);
    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    return (
        <main className="dashboard-shell">
            <header className="dashboard-header">
                <div className="brand">
                    <span className="brand-mark">M</span>
                    <div>
                        <p className="eyebrow">MonEspace</p>
                        <h1>Mon tableau de bord</h1>
                    </div>
                </div>
                <button className="logout-button" onClick={handleLogout}>Déconnexion</button>
            </header>

            <section className="board-content" aria-live="polite">
                {board ? (
                    <>
                        <p className="eyebrow">Mon espace personnel</p>
                        <h2>{board.name}</h2>
                        <p>Ton tableau est prêt.</p>
                    </>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : (
                    <p>Chargement de ton tableau...</p>
                )}
            </section>
        </main>
    );
}

export default DashboardPage;