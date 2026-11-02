import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "../api.js";

function toLocalDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

function CalendarPage() {
    const [theme] = useState(() => localStorage.getItem("dashboard-theme") || "light");
    const [planningWidgets, setPlanningWidgets] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [draft, setDraft] = useState(null);
    const [title, setTitle] = useState("");
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`${API_URL}/api/boards`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || "Chargement du calendrier impossible.");
                }

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
            .catch((requestError) => setError(requestError.message))
            .finally(() => setLoading(false));
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

    const calendarEvents = planningWidgets.flatMap((widget) =>
        widget.events.map((event) => ({
            id: `${widget.id}-${event.eventId}`,
            title: event.title,
            start: event.startDate,
            end: event.endDate || undefined,
            extendedProps: {
                eventId: event.eventId,
                widgetId: widget.id,
                widgetTitle: widget.title,
                description: event.description,
            },
        }))
    );

    function startNewEvent(dateInfo) {
        if (planningWidgets.length === 0) {
            setError("Ajoute d’abord un widget Planning depuis le tableau de bord.");
            return;
        }

        setSelectedEvent(null);
        setTitle("");
        setDescription("");
        setEndDate("");
        setDraft({
            widgetId: String(planningWidgets[0].id),
            startDate: toLocalDateTime(dateInfo.dateStr.includes("T")
                ? dateInfo.dateStr
                : `${dateInfo.dateStr}T09:00:00`),
        });
        setError("");
    }

    function handleEventClick(info) {
        setSelectedEvent({
            title: info.event.title,
            start: info.event.start,
            end: info.event.end,
            description: info.event.extendedProps.description,
            widgetTitle: info.event.extendedProps.widgetTitle,
        });
        setDraft(null);
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!draft) return;

        try {
            const eventData = {
                title: title.trim(),
                startDate: new Date(draft.startDate).toISOString(),
                endDate: endDate ? new Date(endDate).toISOString() : null,
                description: description.trim(),
            };
            const result = await authenticatedRequest(
                `/api/widgets/${draft.widgetId}/events`,
                { method: "POST", body: JSON.stringify(eventData) }
            );
            setPlanningWidgets((current) => current.map((widget) =>
                String(widget.id) === String(draft.widgetId)
                    ? { ...widget, events: [...widget.events, result.event] }
                    : widget
            ));
            setDraft(null);
            setError("");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <main className={`calendar-shell dashboard-shell--${theme}`}>
            <header className="calendar-header">
                <div>
                    <p className="eyebrow">MonEspace</p>
                    <h1><CalendarDays size={26} aria-hidden="true" /> Calendrier</h1>
                </div>
                <Link className="calendar-back-link" to="/dashboard">
                    <ArrowLeft size={17} aria-hidden="true" />
                    Retour au tableau
                </Link>
            </header>

            {error && <p className="error-message" role="alert">{error}</p>}
            {loading ? (
                <p>Chargement du calendrier...</p>
            ) : (
                <div className="calendar-layout">
                    <section className="calendar-main" aria-label="Calendrier mensuel">
                        <FullCalendar
                            plugins={[dayGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            locale={frLocale}
                            headerToolbar={{
                                left: "prev,next today",
                                center: "title",
                                right: "dayGridMonth",
                            }}
                            buttonText={{ today: "Aujourd’hui", month: "Mois" }}
                            events={calendarEvents}
                            dateClick={startNewEvent}
                            eventClick={handleEventClick}
                            height="auto"
                            dayMaxEvents
                            displayEventTime
                        />
                        {planningWidgets.length === 0 && (
                            <p className="calendar-empty-note">
                                Aucun planning n’est encore créé. Ajoute un widget Planning depuis le tableau de bord.
                            </p>
                        )}
                    </section>

                    <aside className="calendar-detail" aria-live="polite">
                        {draft ? (
                            <form className="calendar-event-form" onSubmit={handleSubmit}>
                                <h2>Nouvel événement</h2>
                                <label>
                                    Planning
                                    <select
                                        value={draft.widgetId}
                                        onChange={(change) => setDraft((current) => ({
                                            ...current,
                                            widgetId: change.target.value,
                                        }))}
                                    >
                                        {planningWidgets.map((widget) => (
                                            <option key={widget.id} value={widget.id}>{widget.title}</option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Titre
                                    <input value={title} onChange={(change) => setTitle(change.target.value)} required maxLength={255} />
                                </label>
                                <label>
                                    Début
                                    <input
                                        type="datetime-local"
                                        value={draft.startDate}
                                        onChange={(change) => setDraft((current) => ({ ...current, startDate: change.target.value }))}
                                        required
                                    />
                                </label>
                                <label>
                                    Fin (facultative)
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        min={draft.startDate}
                                        onChange={(change) => setEndDate(change.target.value)}
                                    />
                                </label>
                                <label>
                                    Description
                                    <textarea value={description} onChange={(change) => setDescription(change.target.value)} rows={3} />
                                </label>
                                <div className="calendar-form-actions">
                                    <button type="submit">Ajouter l’événement</button>
                                    <button type="button" onClick={() => setDraft(null)}>Annuler</button>
                                </div>
                            </form>
                        ) : selectedEvent ? (
                            <section>
                                <h2>{selectedEvent.title}</h2>
                                <p>{selectedEvent.widgetTitle}</p>
                                {selectedEvent.start && <p>{selectedEvent.start.toLocaleString("fr-FR")}</p>}
                                {selectedEvent.end && <p>Fin : {selectedEvent.end.toLocaleString("fr-FR")}</p>}
                                {selectedEvent.description && <p>{selectedEvent.description}</p>}
                            </section>
                        ) : (
                            <p>Clique sur une date pour ajouter un événement, ou sur un événement pour voir ses détails.</p>
                        )}
                    </aside>
                </div>
            )}
        </main>
    );
}

export default CalendarPage;
