
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
import PlanningWidget from "../components/PlanningWidget";
import PostItWidget from "../components/PostItWidget";

function DashboardPage() {
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [error, setError] = useState("");
    const [postIts, setPostIts] = useState([]);
    const [planningWidgets, setPlanningWidgets] = useState([]);
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
                setPlanningWidgets(
                    data.widgets
                        .filter((widget) => widget.type === "planning")
                        .map((widget) => ({
                            id: widget.widget_id,
                            title: "Mon planning",
                            events: Array.isArray(widget.data) ? widget.data : [],
                            posX: widget.pos_x,
                            posY: widget.pos_y,
                        }))
                );
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

    const addPlanningWidget = async () => {
        if (!board) return;

        try {
            const { widget } = await authenticatedRequest("/api/widgets", {
                method: "POST",
                body: JSON.stringify({
                    boardId: board.board_id,
                    type: "planning",
                    posX: 24 + (planningWidgets.length % 3) * 340,
                    posY: 24 + Math.floor(planningWidgets.length / 3) * 420,
                }),
            });
            setPlanningWidgets((current) => [
                ...current,
                {
                    id: widget.widget_id,
                    title: "Mon planning",
                    events: [],
                    posX: widget.pos_x,
                    posY: widget.pos_y,
                },
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
        const isPlanning = planningWidgets.some((widget) => widget.id === active.id);
        const widgets = isPlanning ? planningWidgets : postIts;
        const widget = widgets.find((item) => item.id === active.id);
        if (!widget) return;

        const oldPosition = {
            posX: widget.posX ?? 24,
            posY: widget.posY ?? 24,
        };
        const position = {
            posX: Math.max(0, Math.round(oldPosition.posX + delta.x)),
            posY: Math.max(0, Math.round(oldPosition.posY + delta.y)),
        };

        const setWidgets = isPlanning ? setPlanningWidgets : setPostIts;
        setWidgets((current) =>
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
            setWidgets((current) =>
                current.map((widget) =>
                    widget.id === active.id
                        ? { ...widget, ...oldPosition }
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
                    <div className="planning-widget-list">
                        {planningWidgets.map((planningWidget) => (
                            <PlanningWidget
                                key={planningWidget.id}
                                id={planningWidget.id}
                                title={planningWidget.title}
                                position={{ x: planningWidget.posX, y: planningWidget.posY }}
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
                </DndContext>
            </section>
        </main>
    );
}

export default DashboardPage;
