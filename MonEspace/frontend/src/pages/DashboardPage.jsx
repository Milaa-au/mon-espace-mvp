import { useNavigate } from "react-router-dom";

function DashboardPage() {
    const navigate = useNavigate();
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
                <p className="eyebrow">Espace sécurisé</p>
                <h2>Bienvenue dans MonEspace</h2>
            </section>
        </main>
    );
}

export default DashboardPage;