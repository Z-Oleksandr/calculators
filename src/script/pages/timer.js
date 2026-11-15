import { boilSeconds, formatClock } from "../lib/eggTimer.js";
import { highlight, message, text } from "../i18n.js";
import { showError, showResult } from "../dom.js";
import { numberValue, persist, value } from "../form.js";

const TICK_MS = 250;
const BEEPS = 4;

/**
 * Countdown state machine: idle -> running <-> paused -> done. The remaining
 * time is derived from a wall-clock deadline, so throttled background tabs
 * still finish on time.
 */
export function init(form) {
    const clock = document.getElementById("clock");
    const progress = document.getElementById("progress");
    const startButton = document.getElementById("timer-start");
    const resetButton = document.getElementById("timer-reset");
    const labels = Object.fromEntries(
        [...document.getElementById("timer-labels").content.children].map(
            (el) => [el.dataset.key, el.textContent],
        ),
    );
    const pageTitle = document.title;

    let duration = 0;
    let remaining = 0;
    let deadline = 0;
    let interval = null;
    let audio = null;
    let wakeLock = null;

    function render() {
        clock.textContent = formatClock(remaining);
        progress.value = duration > 0 ? 1 - remaining / duration : 0;
        if (interval) {
            document.title = text("timer.running").replace(
                "{time}",
                formatClock(remaining),
            );
        } else {
            document.title = pageTitle;
        }
    }

    function recalculate() {
        const seconds = boilSeconds({
            size: value(form, "size"),
            start: value(form, "start"),
            doneness: value(form, "doneness"),
            altitude: numberValue(form, "altitude") ?? Number.NaN,
        });
        startButton.disabled = seconds === null;
        if (seconds === null) {
            duration = remaining = 0;
            showError("timer.invalid");
        } else {
            duration = remaining = seconds;
            showResult([
                message("timer.time", {
                    time: highlight(formatClock(seconds)),
                }),
            ]);
        }
        render();
    }

    async function keepScreenOn(on) {
        try {
            if (on && "wakeLock" in navigator) {
                wakeLock = await navigator.wakeLock.request("screen");
            } else if (!on && wakeLock) {
                await wakeLock.release();
                wakeLock = null;
            }
        } catch {
            wakeLock = null;
        }
    }

    function beep() {
        if (!audio) return;
        const startAt = audio.currentTime;
        for (let i = 0; i < BEEPS; i++) {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.frequency.value = 880;
            gain.gain.setValueAtTime(0.2, startAt + i * 0.4);
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                startAt + i * 0.4 + 0.3,
            );
            oscillator.connect(gain).connect(audio.destination);
            oscillator.start(startAt + i * 0.4);
            oscillator.stop(startAt + i * 0.4 + 0.3);
        }
    }

    function stopTicking() {
        clearInterval(interval);
        interval = null;
        keepScreenOn(false);
    }

    function tick() {
        remaining = Math.max(0, (deadline - Date.now()) / 1000);
        if (remaining <= 0) {
            stopTicking();
            beep();
            navigator.vibrate?.([300, 150, 300, 150, 300]);
            startButton.textContent = labels.start;
            startButton.disabled = true;
            showResult([message("timer.done")]);
        }
        render();
    }

    function setControlsLocked(locked) {
        for (const element of form.elements) element.disabled = locked;
    }

    startButton.addEventListener("click", () => {
        if (interval) {
            stopTicking();
            startButton.textContent = labels.resume;
            render();
            return;
        }
        if (remaining <= 0) return;
        if (!audio && "AudioContext" in window) audio = new AudioContext();
        audio?.resume();
        deadline = Date.now() + remaining * 1000;
        interval = setInterval(tick, TICK_MS);
        keepScreenOn(true);
        setControlsLocked(true);
        resetButton.disabled = false;
        startButton.textContent = labels.pause;
        render();
    });

    resetButton.addEventListener("click", () => {
        stopTicking();
        setControlsLocked(false);
        resetButton.disabled = true;
        startButton.textContent = labels.start;
        recalculate();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && interval)
            keepScreenOn(true);
    });

    form.addEventListener("change", () => {
        recalculate();
        persist(form);
    });
    form.addEventListener("submit", (event) => event.preventDefault());
    recalculate();
}
