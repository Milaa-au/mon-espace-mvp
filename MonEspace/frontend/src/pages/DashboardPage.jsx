
import { lazy, Suspense, useEffect, useState } from "react";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../api.js";
import PlanningWidget from "../components/PlanningWidget";
import TimerWidget from "../components/TimerWidget";

const PostItWidget = lazy(() => import("../components/PostItWidget"));

function InlineIcon({ name, size = 20, ...props }) {
    const shapes = {
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
        note: <><path d="M5 3h14a2 2 0 0 1 2 2v14l-5 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M16 21v-5h5M7 8h10M7 12h8" /></>,
        timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 5V2" /></>,
        sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
        moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />,
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {shapes[name]}
        </svg>
    );
}

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
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor)
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
                setPostIts(
                    data.widgets
                        .filter((widget) => widget.type === "postit")
                        .map((widget) => ({
                            id: widget.widget_id,
                            title: "Mon Post-it",
                            content: widget.data?.content ?? "",
                            posX: widget.pos_x,
                            posY: widget.pos_y,
                            width: widget.width,
                            height: widget.height,
                        }))
                );
                setPlanningWidgets(
                    data.widgets
                        .filter((widget) => widget.type === "planning")
                        .map((widget) => ({
                            id: widget.widget_id,
                            title: "Mon planning",
                            events: Array.isArray(widget.data) ? widget.data : [],
                            posX: widget.pos_x,
                            posY: widget.pos_y,
                            width: widget.width,
                            height: widget.height,
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
                            width: widget.width,
                            height: widget.height,
                        }))
                );
            })
            .catch((requestError) => setError(requestError.message));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
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

    const getNextPosition = () => {
        const index = postIts.length + planningWidgets.length + timers.length;
        return {
            posX: 24 + (index % 3) * 340,
            posY: 24 + Math.floor(index / 3) * 280,
        };
    };

    const addPostIt = async () => {
        if (!board) return;

        const position = getNextPosition();
        try {
            const { widget } = await authenticatedRequest("/api/widgets", {
                method: "POST",
                body: JSON.stringify({
                    boardId: board.board_id,
                    type: "postit",
                    ...position,
                    width: 320,
                    height: 240,
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
                    width: widget.width,
                    height: widget.height,
                },
            ]);
            setError("");
            setShowWidgetMenu(false);
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
                    ...getNextPosition(),
                    width: 380,
                    height: 420,
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
                    width: widget.width,
                    height: widget.height,
                },
            ]);
            setError("");
            setShowWidgetMenu(false);
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const addTimer = async () => {
        if (!board) return;

        try {
            const { widget } = await authenticatedRequest("/api/widgets", {
                method: "POST",
                body: JSON.stringify({
                    boardId: board.board_id,
                    type: "timer",
                    ...getNextPosition(),
                    width: 320,
                    height: 280,
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
                    width: widget.width,
                    height: widget.height,
                },
            ]);
            setError("");
            setShowWidgetMenu(false);
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

    const updateWidget = async (widgetId, changes) => {
        const collections = [
            [postIts, setPostIts],
            [planningWidgets, setPlanningWidgets],
            [timers, setTimers],
        ];
        const collection = collections.find(([items]) =>
            items.some((item) => item.id === widgetId)
        );
        if (!collection) return;

        const [items, setItems] = collection;
        const previous = items.find((item) => item.id === widgetId);
        setItems((current) => current.map((item) =>
            item.id === widgetId ? { ...item, ...changes } : item
        ));

        try {
            await authenticatedRequest(`/api/widgets/${widgetId}`, {
                method: "PATCH",
                body: JSON.stringify(changes),
            });
            setError("");
        } catch (requestError) {
            setItems((current) => current.map((item) =>
                item.id === widgetId ? { ...item, ...previous } : item
            ));
            setError(requestError.message);
        }
    };

    const saveWidgetPosition = ({ active, delta }) => {
        const widget = [...postIts, ...planningWidgets, ...timers]
            .find((item) => item.id === active.id);
        if (!widget) return;

        updateWidget(active.id, {
            posX: Math.max(0, Math.round((widget.posX ?? 24) + delta.x)),
            posY: Math.max(0, Math.round((widget.posY ?? 24) + delta.y)),
        });
    };

    const saveWidgetSize = (widgetId, size) =>
        updateWidget(widgetId, {
            width: Math.round(size.width),
            height: Math.round(size.height),
        });

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

    const updatePostIt = (id, content) => updateWidget(id, { content });

    const deletePostIt = async (id) => {
        try {
            await authenticatedRequest(`/api/widgets/${id}`, { method: "DELETE" });
            setPostIts((current) => current.filter((postIt) => postIt.id !== id));
        } catch (requestError) {
            setError(requestError.message);
        }
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

                <nav className="dashboard-header__actions" aria-label="Navigation du tableau">
                    <Link className="calendar-link" to="/calendar">
                        <InlineIcon name="calendar" size={18} aria-hidden="true" />
                        Calendrier
                    </Link>
                    <button className="logout-button" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </nav>
            </header>

            <section className="dashboard-widgets">
                <div className="widgets-header">
                    <h2>Espace de travail</h2>
                </div>

                {error && <p className="error-message" role="alert">{error}</p>}

                <DndContext sensors={sensors} onDragEnd={saveWidgetPosition}>
                    <div className="widget-canvas">
                        <Suspense fallback={null}>
                            {postIts.map((postIt) => (
                                <PostItWidget
                                    key={postIt.id}
                                    id={postIt.id}
                                    position={{ x: postIt.posX, y: postIt.posY }}
                                    width={postIt.width}
                                    height={postIt.height}
                                    title={postIt.title}
                                    content={postIt.content}
                                    onChange={(newContent) => updatePostIt(postIt.id, newContent)}
                                    onResize={saveWidgetSize}
                                    onDelete={deletePostIt}
                                />
                            ))}
                        </Suspense>

                        {planningWidgets.map((planningWidget) => (
                            <PlanningWidget
                                key={planningWidget.id}
                                id={planningWidget.id}
                                position={{ x: planningWidget.posX, y: planningWidget.posY }}
                                width={planningWidget.width}
                                height={planningWidget.height}
                                title={planningWidget.title}
                                events={planningWidget.events}
                                onAddEvent={(event) => addPlanningEvent(planningWidget.id, event)}
                                onUpdateEvent={(event) => updatePlanningEvent(planningWidget.id, event)}
                                onDeleteEvent={(eventId) => deletePlanningEvent(planningWidget.id, eventId)}
                                onEventsChange={(events) =>
                                    setPlanningWidgets((current) => current.map((widget) =>
                                        widget.id === planningWidget.id
                                            ? { ...widget, events }
                                            : widget
                                    ))
                                }
                                onResize={saveWidgetSize}
                                onDelete={deletePlanningWidget}
                            />
                        ))}

                        {timers.map((item) => (
                            <TimerWidget
                                key={item.id}
                                id={item.id}
                                timer={item.timer}
                                position={{ x: item.posX, y: item.posY }}
                                width={item.width}
                                height={item.height}
                                onSetDuration={setTimerDuration}
                                onStart={startTimer}
                                onPause={pauseTimer}
                                onReset={resetTimer}
                                onRefresh={() => refreshTimer(item.id)}
                                onResize={saveWidgetSize}
                                onDelete={deleteTimer}
                            />
                        ))}
                    </div>
                </DndContext>
            </section>

            <aside className="dashboard-controls" aria-label="Contrôles du tableau">
                <div className="dashboard-theme-controls" aria-label="Thème d’affichage">
                    <button
                        type="button"
                        aria-pressed={theme === "light"}
                        aria-label="Mode clair"
                        title="Mode clair"
                        onClick={() => setTheme("light")}
                    >
                        <InlineIcon name="sun" size={18} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-pressed={theme === "dark"}
                        aria-label="Mode sombre"
                        title="Mode sombre"
                        onClick={() => setTheme("dark")}
                    >
                        <InlineIcon name="moon" size={18} aria-hidden="true" />
                    </button>
                </div>

                {showWidgetMenu && (
                    <div className="widget-launcher-menu" role="menu" aria-label="Ajouter un widget">
                        <button
                            className="widget-launcher-icon"
                            role="menuitem"
                            type="button"
                            aria-label="Ajouter un Post-it"
                            title="Ajouter un Post-it"
                            onClick={addPostIt}
                            disabled={!board}
                        >
                            <InlineIcon name="note" size={22} aria-hidden="true" />
                        </button>
                        <button
                            className="widget-launcher-icon"
                            role="menuitem"
                            type="button"
                            aria-label="Ajouter un planning"
                            title="Ajouter un planning"
                            onClick={addPlanningWidget}
                            disabled={!board}
                        >
                            <InlineIcon name="calendar" size={22} aria-hidden="true" />
                        </button>
                        <button
                            className="widget-launcher-icon"
                            role="menuitem"
                            type="button"
                            aria-label="Ajouter un timer"
                            title="Ajouter un timer"
                            onClick={addTimer}
                            disabled={!board}
                        >
                            <InlineIcon name="timer" size={22} aria-hidden="true" />
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
