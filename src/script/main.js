import { message, text } from "./i18n.js";
import { InputError, showError, showResult } from "./dom.js";
import { persist, restore } from "./form.js";
import * as eggs from "./pages/eggs.js";
import * as work from "./pages/work.js";
import * as timer from "./pages/timer.js";
import * as age from "./pages/age.js";
import * as countdown from "./pages/countdown.js";
import * as pizza from "./pages/pizza.js";
import * as split from "./pages/split.js";

const CONTROLLERS = { eggs, work, timer, age, countdown, pizza, split };
const COPY_FEEDBACK_MS = 2000;

function remember(theme) {
    try {
        localStorage.setItem("theme", theme);
        return true;
    } catch {
        return false;
    }
}

function setupTheme() {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const current = () =>
        root.dataset.theme || (prefersDark.matches ? "dark" : "light");
    const sync = () =>
        button.setAttribute("aria-pressed", String(current() === "dark"));
    button.addEventListener("click", () => {
        const next = current() === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        remember(next);
        sync();
    });
    prefersDark.addEventListener("change", sync);
    sync();
}

function setupMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;
    const setOpen = (open) => {
        toggle.setAttribute("aria-expanded", String(open));
        nav.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", () =>
        setOpen(toggle.getAttribute("aria-expanded") !== "true"),
    );
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
            setOpen(false);
            toggle.focus();
        }
    });
}

function setupCopyLink() {
    const button = document.querySelector(".copy-link");
    if (!button) return null;
    const label = button.textContent;
    button.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            button.textContent = text("copied");
        } catch {
            button.textContent = text("copyFailed");
        }
        setTimeout(() => {
            button.textContent = label;
        }, COPY_FEEDBACK_MS);
    });
    return button;
}

async function setupCalculator(form, controller, copyButton) {
    const origin = restore(form);
    await controller.init?.(form);
    if (!controller.compute) {
        if (copyButton) copyButton.hidden = false;
        return;
    }

    let running = 0;
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const run = ++running;
        const submit = form.querySelector('[type="submit"]');
        submit?.setAttribute("aria-busy", "true");
        try {
            const lines = await controller.compute(form);
            if (run !== running) return;
            showResult(lines);
            persist(form);
            if (copyButton) copyButton.hidden = false;
        } catch (err) {
            if (run !== running) return;
            if (err instanceof InputError) {
                showError(err.key);
            } else {
                console.error(err);
                showResult([message("errors.invalidNumber")], { error: true });
            }
        } finally {
            submit?.removeAttribute("aria-busy");
        }
    });

    if (origin === "url") form.requestSubmit();
}

setupTheme();
setupMenu();
const copyButton = setupCopyLink();
const form = document.getElementById("calc");
const controller = CONTROLLERS[document.body.dataset.page];
if (form && controller) setupCalculator(form, controller, copyButton);
