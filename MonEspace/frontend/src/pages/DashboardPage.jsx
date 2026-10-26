
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";
import PostItWidget from "../components/PostItWidget";

function DashboardPage() {
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [error, setError] = useState("");
    const [postIts, setPostIts] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch(`${API_URL}/api/boards`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Chargement impossible."
                    );
                }

                setBoard(data.board);
            })
            .catch((requestError) => setError(requestError.message));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    const addPostIt = () => {
        const newPostIt = {
            id: crypto.randomUUID(),
            title: "Mon Post-it",
            content: "",
        };

        setPostIts((current) => [...current, newPostIt]);
    };

    const updatePostIt = (id, content) => {
        setPostIts((current) =>
            current.map((postIt) =>
                postIt.id === id ? { ...postIt, content } : postIt
            )
        );
    };

    const deletePostIt = (id) => {
        setPostIts((current) =>
            current.filter((postIt) => postIt.id !== id)
        );
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

                <button
                    className="logout-button"
                    onClick={handleLogout}
                >
                    Déconnexion
                </button>
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

            <section className="dashboard-widgets">
                <div className="widgets-header">
                    <h2>Mes widgets</h2>

                    <button
                        type="button"
                        className="add-postit-button"
                        onClick={addPostIt}
                    >
                        + Ajouter un Post-it
                    </button>
                </div>

                <div className="postit-grid">
                    {postIts.map((postIt) => (
                        <PostItWidget
                            key={postIt.id}
                            id={postIt.id}
                            title={postIt.title}
                            content={postIt.content}
                            onChange={(content) =>
                                updatePostIt(postIt.id, content)
                            }
                            onDelete={deletePostIt}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}

export default DashboardPage;
