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
    title = "Mon planning",
    position = { x: 24, y: 24 },
    events = EMPTY_EVENTS,
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onEventsChange,
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
            style={{
                position: "absolute",
                left: position.x,
                top: position.y,
                width: 320,
            }}
            onDelete={onDelete ? () => onDelete(id) : undefined}
        >
            <form className="planning-widget__form" onSubmit={handleSubmit}>
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
                {eventList.length === 0 ? (
                    <p>Aucun événement pour le moment.</p>
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
                                            <p>
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
                                                <p>{planningEvent.description}</p>
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