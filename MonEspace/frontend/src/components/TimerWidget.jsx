import { useEffect, useRef, useState } from "react";
import WidgetContainer from "./WidgetContainer";
import "./TimerWidget.css";

export function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function TimerWidget({
    id,
    timer,
    position = { x: 24, y: 24 },
    onSetDuration,
    onStart,
    onPause,
    onReset,
    onRefresh,
    onDelete,
}) {
    const [timerState, setTimerState] = useState(timer);
    const [durationMinutes, setDurationMinutes] = useState(
        String(Math.max(1, Math.ceil((timer.durationSeconds ?? 1500) / 60)))
    );
    const [now, setNow] = useState(Date.now());
    const [error, setError] = useState("");
    const completionSyncRequested = useRef(false);

    useEffect(() => {
        setTimerState(timer);
        setDurationMinutes(
            String(Math.max(1, Math.ceil((timer.durationSeconds ?? 1500) / 60)))
        );
        setNow(Date.now());
    }, [timer]);

    useEffect(() => {
        if (timerState.status !== "running") return undefined;

        const interval = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(interval);
    }, [timerState.status]);

    const storedRemaining = timerState.remainingSeconds ?? timerState.durationSeconds ?? 0;
    const elapsedSeconds = timerState.startedAt
        ? Math.floor((now - new Date(timerState.startedAt).getTime()) / 1000)
        : 0;
    const remainingSeconds = timerState.status === "running"
        ? Math.max(0, storedRemaining - elapsedSeconds)
        : storedRemaining;

    useEffect(() => {
        if (timerState.status !== "running" || remainingSeconds > 0) {
            completionSyncRequested.current = false;
            return;
        }

        if (completionSyncRequested.current) return;
        completionSyncRequested.current = true;
        onRefresh()
            .then(setTimerState)
            .catch((requestError) => setError(requestError.message));
    }, [timerState.status, remainingSeconds, onRefresh]);

    async function runAction(action) {
        setError("");

        try {
            const updatedTimer = await action();
            setTimerState(updatedTimer);
            setNow(Date.now());
            setDurationMinutes(
                String(Math.max(1, Math.ceil(updatedTimer.durationSeconds / 60)))
            );
        } catch (requestError) {
            setError(requestError.message || "Impossible de mettre à jour le timer.");
        }
    }

    function handleSetDuration(event) {
        event.preventDefault();
        const minutes = Number(durationMinutes);

        if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 10080) {
            setError("La durée doit être comprise entre 1 minute et 7 jours.");
            return;
        }

        runAction(() => onSetDuration(id, minutes * 60));
    }

    const timerStatus = {
        idle: "Prêt",
        running: "En cours",
        paused: "En pause",
        completed: "Terminé",
    }[timerState.status] ?? "Prêt";

    return (
        <WidgetContainer
            id={id}
            title={timerState.label || "Timer"}
            type="timer"
            style={{
                position: "absolute",
                left: position.x,
                top: position.y,
                width: 280,
            }}
            onDelete={onDelete ? () => onDelete(id) : undefined}
        >
            <div className="timer-widget">
                <p className="timer-widget__display" role="timer" aria-live="off">
                    {formatTime(remainingSeconds)}
                </p>
                <p className="timer-widget__status" aria-live="polite">{timerStatus}</p>

                <form className="timer-widget__duration" onSubmit={handleSetDuration}>
                    <label htmlFor={`timer-duration-${id}`}>Durée (minutes)</label>
                    <div>
                        <input
                            id={`timer-duration-${id}`}
                            type="number"
                            min="1"
                            max="10080"
                            step="1"
                            value={durationMinutes}
                            onChange={(event) => setDurationMinutes(event.target.value)}
                            disabled={timerState.status === "running"}
                            required
                        />
                        <button type="submit" disabled={timerState.status === "running"}>
                            Définir
                        </button>
                    </div>
                </form>

                {error && <p className="timer-widget__error" role="alert">{error}</p>}

                <div className="timer-widget__actions">
                    {timerState.status === "running" ? (
                        <button type="button" onClick={() => runAction(() => onPause(id))}>
                            Pause
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => runAction(() => onStart(id))}
                            disabled={timerState.status === "completed"}
                        >
                            Démarrer
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => runAction(() => onReset(id))}
                    >
                        Réinitialiser
                    </button>
                </div>
            </div>
        </WidgetContainer>
    );
}

export default TimerWidget;