
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";
import PlanningWidget from "../components/PlanningWidget";
import PostItWidget from "../components/PostItWidget";
import TimerWidget from "../components/TimerWidget";

function DashboardPage() {
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [error, setError] = useState("");
    const [postIts, setPostIts] = useState([]);
    const [planningWidgets, setPlanningWidgets] = useState([]);
    const [timers, setTimers] = useState([]);
    const [showWidgetMenu, setShowWidgetMenu] = useState(false);
    const [theme, setTheme] = useState(
        () => localStorage.getItem("dashboard-theme") || "light"
    );

    useEffect(() => {
        localStorage.setItem("dashboard-theme", theme);
    }, [theme]);

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
                setTimers(
                    data.widgets
                        .filter((widget) => widget.type === "timer")
                        .map((widget) => ({
                            id: widget.widget_id,
                            timer: widget.data,
                            posX: widget.pos_x,
                            posY: widget.pos_y,
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

    const addTimer = async () => {
        if (!board) return;

        try {
            const column = timers.length % 3;
            const row = Math.floor(timers.length / 3);
            const { widget } = await authenticatedRequest("/api/widgets", {
                method: "POST",
                body: JSON.stringify({
                    boardId: board.board_id,
                    type: "timer",
                    posX: 24 + column * 304,
                    posY: 24 + row * 224,
                    data: { durationSeconds: 1500 },
                }),
            });
            setTimers((current) => [
                ...current,
                {
                    id: widget.widget_id,
                    timer: widget.data,
                    posX: widget.pos_x,
                    posY: widget.pos_y,
                },
            ]);
            setError("");
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const timerRequest = async (widgetId, path, options = {}) => {
        const result = await authenticatedRequest(
            `/api/widgets/${widgetId}/timer${path}`,
            options
        );
        return result.timer;
    };

    const updateTimer = (widgetId, timer) =>
        setTimers((current) =>
            current.map((item) => item.id === widgetId ? { ...item, timer } : item)
        );

    const setTimerDuration = async (widgetId, durationSeconds) => {
        const timer = await timerRequest(widgetId, "/duration", {
            method: "PATCH",
            body: JSON.stringify({ durationSeconds }),
        });
        updateTimer(widgetId, timer);
        return timer;
    };

    const startTimer = async (widgetId) => {
        const timer = await timerRequest(widgetId, "/start", { method: "POST" });
        updateTimer(widgetId, timer);
        return timer;
    };

    const pauseTimer = async (widgetId) => {
        const timer = await timerRequest(widgetId, "/pause", { method: "POST" });
        updateTimer(widgetId, timer);
        return timer;
    };

    const resetTimer = async (widgetId) => {
        const timer = await timerRequest(widgetId, "/reset", { method: "POST" });
        updateTimer(widgetId, timer);
        return timer;
    };

    const refreshTimer = async (widgetId) => {
        const timer = await timerRequest(widgetId, "");
        updateTimer(widgetId, timer);
        return timer;
    };

    const deleteTimer = async (widgetId) => {
        try {
            await authenticatedRequest(`/api/widgets/${widgetId}`, {
                method: "DELETE",
            });
            setTimers((current) => current.filter((item) => item.id !== widgetId));
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
        <main className={`dashboard-shell dashboard-shell--${theme}`}>
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

            <section className="dashboard-widgets">
                <div className="widgets-header">
                    <h2>Espace de travail</h2>
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
                <div className="timer-widget-list">
                    {timers.map((item) => (
                        <TimerWidget
                            key={item.id}
                            id={item.id}
                            timer={item.timer}
                            position={{ x: item.posX, y: item.posY }}
                            onSetDuration={setTimerDuration}
                            onStart={startTimer}
                            onPause={pauseTimer}
                            onReset={resetTimer}
                            onRefresh={() => refreshTimer(item.id)}
                            onDelete={deleteTimer}
                        />
                    ))}
                </div>
            </section>

            <aside className="dashboard-controls" aria-label="Contrôles du tableau">
                <div className="dashboard-theme-controls" aria-label="Thème d’affichage">
                    <button
                        type="button"
                        aria-pressed={theme === "light"}
                        onClick={() => setTheme("light")}
                    >
                        Clair
                    </button>
                    <button
                        type="button"
                        aria-pressed={theme === "dark"}
                        onClick={() => setTheme("dark")}
                    >
                        Sombre
                    </button>
                </div>

                {showWidgetMenu && (
                    <div className="widget-launcher-menu" role="menu" aria-label="Ajouter un widget">
                        <button role="menuitem" type="button" onClick={addPostIt}>
                            Post-it
                        </button>
                        <button role="menuitem" type="button" onClick={addPlanningWidget}>
                            Planning
                        </button>
                        <button role="menuitem" type="button" onClick={addTimer}>
                            Timer
                        </button>
                    </div>
                )}

                <button
                    type="button"
                    className="widget-launcher-toggle"
                    aria-expanded={showWidgetMenu}
                    aria-haspopup="menu"
                    onClick={() => setShowWidgetMenu((open) => !open)}
                >
                    {showWidgetMenu ? "Fermer" : "+ Ajouter un widget"}
                </button>
            </aside>
        </main>
    );
}

export default DashboardPage;
