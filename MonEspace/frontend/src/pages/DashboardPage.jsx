
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";
import PlanningWidget from "../components/PlanningWidget";
import PostItWidget from "../components/PostItWidget";

function DashboardPage() {
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [error, setError] = useState("");
    const [postIts, setPostIts] = useState([]);
    const [planningWidgets, setPlanningWidgets] = useState([]);

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
                setPlanningWidgets(
                    data.widgets
                        .filter((widget) => widget.type === "planning")
                        .map((widget) => ({
                            id: widget.widget_id,
                            title: "Mon planning",
                            events: Array.isArray(widget.data) ? widget.data : [],
                        }))
                );
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

    const addPlanningWidget = async () => {
        if (!board) return;

        try {
            const { widget } = await authenticatedRequest("/api/widgets", {
                method: "POST",
                body: JSON.stringify({ boardId: board.board_id, type: "planning" }),
            });
            setPlanningWidgets((current) => [
                ...current,
                { id: widget.widget_id, title: "Mon planning", events: [] },
            ]);
            setError("");
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const addPlanningEvent = async (widgetId, event) => {
        const result = await authenticatedRequest(
            `/api/widgets/${widgetId}/events`,
            { method: "POST", body: JSON.stringify(event) }
        );
        return result.event;
    };

    const updatePlanningEvent = async (widgetId, event) => {
        const result = await authenticatedRequest(
            `/api/widgets/${widgetId}/events/${event.eventId}`,
            { method: "PATCH", body: JSON.stringify(event) }
        );
        return result.event;
    };

    const deletePlanningEvent = (widgetId, eventId) =>
        authenticatedRequest(`/api/widgets/${widgetId}/events/${eventId}`, {
            method: "DELETE",
        });

    const deletePlanningWidget = async (widgetId) => {
        try {
            await authenticatedRequest(`/api/widgets/${widgetId}`, {
                method: "DELETE",
            });
            setPlanningWidgets((current) =>
                current.filter((widget) => widget.id !== widgetId)
            );
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

                    <div className="widgets-header__actions">
                        <button
                            type="button"
                            className="add-postit-button"
                            onClick={addPostIt}
                        >
                            + Ajouter un Post-it
                        </button>
                        <button
                            type="button"
                            className="add-postit-button"
                            onClick={addPlanningWidget}
                            disabled={!board}
                        >
                            + Ajouter un planning
                        </button>
                    </div>
                </div>

                <div className="postit-grid">
                    {postIts.map((postIt) => (
                        <PostItWidget
                            key={postIt.id}
                            id={postIt.id}
                            title={postIt.title}
                            content={postIt.content}
                            onChange={(newContent) => updatePostIt(postIt.id, newContent)}
                            onDelete={deletePostIt}
                        />
                    ))}
                </div>

                <div className="planning-widget-list">
                    {planningWidgets.map((planningWidget) => (
                        <PlanningWidget
                            key={planningWidget.id}
                            id={planningWidget.id}
                            title={planningWidget.title}
                            events={planningWidget.events}
                            onAddEvent={(event) => addPlanningEvent(planningWidget.id, event)}
                            onUpdateEvent={(event) => updatePlanningEvent(planningWidget.id, event)}
                            onDeleteEvent={(eventId) => deletePlanningEvent(planningWidget.id, eventId)}
                            onEventsChange={(events) =>
                                setPlanningWidgets((current) =>
                                    current.map((widget) =>
                                        widget.id === planningWidget.id
                                            ? { ...widget, events }
                                            : widget
                                    )
                                )
                            }
                            onDelete={deletePlanningWidget}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}

export default DashboardPage;
