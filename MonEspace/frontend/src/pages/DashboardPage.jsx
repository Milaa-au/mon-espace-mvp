
import { useEffect, useState } from "react";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";
import PostItWidget from "../components/PostItWidget";

function DashboardPage() {
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [error, setError] = useState("");
    const [postIts, setPostIts] = useState([]);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor)
    );

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
                setPostIts(
                    data.widgets
                        .filter((widget) => widget.type === "postit")
                        .map((widget) => ({
                            id: widget.widget_id,
                            title: "Mon Post-it",
                            content: widget.data?.content ?? "",
                            posX: widget.pos_x,
                            posY: widget.pos_y,
                        }))
                );
            })
            .catch((requestError) => setError(requestError.message));
    }, []);

    const authenticatedRequest = async (path, options = {}) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "La requête a échoué.");
        }

        return data;
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    const addPostIt = async () => {
        if (!board) return;

        const column = postIts.length % 3;
        const row = Math.floor(postIts.length / 3);

        try {
            const { widget } = await authenticatedRequest("/api/widgets", {
                method: "POST",
                body: JSON.stringify({
                    boardId: board.board_id,
                    type: "postit",
                    posX: 24 + column * 304,
                    posY: 24 + row * 224,
                }),
            });
            setPostIts((current) => [
                ...current,
                {
                    id: widget.widget_id,
                    title: "Mon Post-it",
                    content: widget.data?.content ?? "",
                    posX: widget.pos_x,
                    posY: widget.pos_y,
                },
            ]);
            setError("");
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const updatePostIt = (id, content) => {
        setPostIts((current) =>
            current.map((postIt) =>
                postIt.id === id ? { ...postIt, content } : postIt
            )
        );
    };

    const deletePostIt = async (id) => {
        try {
            await authenticatedRequest(`/api/widgets/${id}`, {
                method: "DELETE",
            });
            setPostIts((current) =>
                current.filter((postIt) => postIt.id !== id)
            );
            setError("");
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const saveWidgetPosition = async ({ active, delta }) => {
        const postIt = postIts.find((widget) => widget.id === active.id);
        if (!postIt) return;

        const position = {
            posX: Math.max(0, Math.round(postIt.posX + delta.x)),
            posY: Math.max(0, Math.round(postIt.posY + delta.y)),
        };

        setPostIts((current) =>
            current.map((widget) =>
                widget.id === active.id ? { ...widget, ...position } : widget
            )
        );

        try {
            await authenticatedRequest(`/api/widgets/${active.id}`, {
                method: "PATCH",
                body: JSON.stringify(position),
            });
            setError("");
        } catch (requestError) {
            setPostIts((current) =>
                current.map((widget) =>
                    widget.id === active.id
                        ? { ...widget, posX: postIt.posX, posY: postIt.posY }
                        : widget
                )
            );
            setError(requestError.message);
        }
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
                        disabled={!board}
                    >
                        + Ajouter un Post-it
                    </button>
                </div>

                {error && <p className="error-message" role="alert">{error}</p>}
                <DndContext sensors={sensors} onDragEnd={saveWidgetPosition}>
                    <div className="postit-grid">
                        {postIts.map((postIt) => (
                            <PostItWidget
                                key={postIt.id}
                                id={postIt.id}
                                position={{ x: postIt.posX, y: postIt.posY }}
                                title={postIt.title}
                                content={postIt.content}
                                onChange={(newContent) => updatePostIt(postIt.id, newContent)}
                                onDelete={deletePostIt}
                            />
                        ))}
                    </div>
                </DndContext>
            </section>
        </main>
    );
}

export default DashboardPage;
