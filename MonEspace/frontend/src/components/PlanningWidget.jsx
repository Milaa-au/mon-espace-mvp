import { useEffect, useState } from "react";
import WidgetContainer from "./WidgetContainer";
import "./PlanningWidget.css";

const EMPTY_EVENTS = [];

function toLocalDateTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date invalide";

    return new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function PlanningWidget({
    id,
    position,
    width,
    height,
    title = "Mon planning",
    events = EMPTY_EVENTS,
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onEventsChange,
    onResize,
    constrainResize,
    onDelete,
}) {
    const [eventList, setEventList] = useState(events);
    const [editingEventId, setEditingEventId] = useState(null);
    const [eventTitle, setEventTitle] = useState("");
    const [startDate, setStartDate] = useState(() => toLocalDateTime(new Date()));
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        setEventList(events);
    }, [events]);

    function resetForm() {
        setEditingEventId(null);
        setEventTitle("");
        setStartDate(toLocalDateTime(new Date()));
        setEndDate("");
        setDescription("");
        setError("");
    }

    function editEvent(event) {
        setEditingEventId(event.eventId ?? event.id);
        setEventTitle(event.title ?? "");
        setStartDate(toLocalDateTime(event.startDate));
        setEndDate(toLocalDateTime(event.endDate));
        setDescription(event.description ?? "");
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : null;

        if (end && end < start) {
            setError("La date de fin doit être après la date de début.");
            return;
        }

        const eventData = {
            title: eventTitle.trim(),
            startDate: start.toISOString(),
            endDate: end ? end.toISOString() : null,
            description: description.trim(),
        };

        try {
            if (editingEventId !== null) {
                const currentEvent = eventList.find(
                    (item) => String(item.eventId ?? item.id) === String(editingEventId)
                );
                const updatedEvent = {
                    ...currentEvent,
                    ...eventData,
                    eventId: currentEvent?.eventId ?? editingEventId,
                };
                const result = await onUpdateEvent?.(updatedEvent);
                const savedEvent = result?.event ?? result ?? updatedEvent;
                const nextEvents = eventList.map((item) =>
                    String(item.eventId ?? item.id) === String(editingEventId)
                        ? savedEvent
                        : item
                );
                setEventList(nextEvents);
                onEventsChange?.(nextEvents);
            } else {
                const result = await onAddEvent?.(eventData);
                const newEvent = result?.event ?? result ?? {
                    ...eventData,
                    eventId: crypto.randomUUID(),
                };
                const nextEvents = [...eventList, newEvent];
                setEventList(nextEvents);
                onEventsChange?.(nextEvents);
            }

            resetForm();
        } catch (requestError) {
            setError(requestError.message || "Impossible d’enregistrer l’événement.");
        }
    }

    async function deleteEvent(event) {
        const eventId = event.eventId ?? event.id;

        try {
            await onDeleteEvent?.(eventId);
            const nextEvents = eventList.filter(
                (item) => String(item.eventId ?? item.id) !== String(eventId)
            );
            setEventList(nextEvents);
            onEventsChange?.(nextEvents);

            if (String(editingEventId) === String(eventId)) {
                resetForm();
            }
        } catch (requestError) {
            setError(requestError.message || "Impossible de supprimer l’événement.");
        }
    }

    return (
        <WidgetContainer
            title={title}
            type="planning"
            id={id}
            position={position}
            width={width}
            height={height}
            onResize={onResize}
            constrainResize={constrainResize}
            onDelete={onDelete ? () => onDelete(id) : undefined}
        >
            <div className="planning-widget__intro">
                <span className="planning-widget__intro-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 10h18" />
                    </svg>
                </span>
                <div>
                    <p className="planning-widget__intro-title">Un peu d’organisation</p>
                    <p className="planning-widget__intro-text">Gardez vos rendez-vous à portée de main.</p>
                </div>
            </div>
            <form className="planning-widget__form" onSubmit={handleSubmit}>
                <p className="planning-widget__section-title">
                    {editingEventId !== null ? "Modifier l’événement" : "Nouvel événement"}
                </p>
                <label>
                    Événement
                    <input
                        type="text"
                        value={eventTitle}
                        onChange={(change) => setEventTitle(change.target.value)}
                        placeholder="Ex. Rendez-vous"
                        required
                    />
                </label>

                <label>
                    Début
                    <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(change) => setStartDate(change.target.value)}
                        required
                    />
                </label>

                <label>
                    Fin (facultative)
                    <input
                        type="datetime-local"
                        value={endDate}
                        min={startDate}
                        onChange={(change) => setEndDate(change.target.value)}
                    />
                </label>

                <label>
                    Description (facultative)
                    <textarea
                        value={description}
                        onChange={(change) => setDescription(change.target.value)}
                        rows={2}
                    />
                </label>

                <div className="planning-widget__form-actions">
                    <button type="submit">
                        {editingEventId !== null ? "Enregistrer" : "Ajouter l’événement"}
                    </button>
                    {editingEventId !== null && (
                        <button type="button" onClick={resetForm}>
                            Annuler
                        </button>
                    )}
                </div>
            </form>

            {error && <p className="error-message" role="alert">{error}</p>}

            <section className="planning-widget__events" aria-label="Événements">
                <div className="planning-widget__events-heading">
                    <h3>Vos événements</h3>
                    <span aria-label={`${eventList.length} événement${eventList.length === 1 ? "" : "s"}`}>
                        {eventList.length}
                    </span>
                </div>
                {eventList.length === 0 ? (
                    <p className="planning-widget__empty">Aucun événement pour le moment.</p>
                ) : (
                    <ul>
                        {eventList
                            .slice()
                            .sort((first, second) => new Date(first.startDate) - new Date(second.startDate))
                            .map((planningEvent, index) => {
                                const eventId = planningEvent.eventId ?? planningEvent.id ?? index;

                                return (
                                    <li key={eventId}>
                                        <article>
                                            <h3>{planningEvent.title}</h3>
                                            <p className="planning-widget__event-date">
                                                <time dateTime={planningEvent.startDate}>
                                                    {formatDate(planningEvent.startDate)}
                                                </time>
                                                {planningEvent.endDate && (
                                                    <>
                                                        {" – "}
                                                        <time dateTime={planningEvent.endDate}>
                                                            {formatDate(planningEvent.endDate)}
                                                        </time>
                                                    </>
                                                )}
                                            </p>
                                            {planningEvent.description && (
                                                <p className="planning-widget__event-description">{planningEvent.description}</p>
                                            )}
                                            <div className="planning-widget__event-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => editEvent(planningEvent)}
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteEvent(planningEvent)}
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        </article>
                                    </li>
                                );
                            })}
                    </ul>
                )}
            </section>
        </WidgetContainer>
    );
}

export default PlanningWidget;