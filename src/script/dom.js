import { message } from "./i18n.js";

/** Error raised for invalid user input; `key` is a client message key. */
export class InputError extends Error {
    constructor(key) {
        super(key);
        this.key = key;
    }
}

/**
 * Renders result lines into #output. Each line is a DOM node or fragment.
 * @param {Node[]} lines
 * @param {{error?: boolean}} [options]
 */
export function showResult(lines, { error = false } = {}) {
    const output = document.getElementById("output");
    if (!output) return;
    output.replaceChildren(
        ...lines.map((line) => {
            const p = document.createElement("p");
            p.append(line);
            return p;
        }),
    );
    output.classList.toggle("is-error", error);
    output.hidden = false;
}

export function showError(key) {
    showResult([message(key)], { error: true });
}
