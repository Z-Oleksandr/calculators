const today = new Date().toISOString().split("T")[0];

// General
document.addEventListener("DOMContentLoaded", () => {
    const endDateField = document.getElementById("endDate");
    if (endDateField) {
        endDateField.value = today;
    }
    preventDefault();
});

function preventDefault() {
    let items = document.getElementsByClassName("preventDefault");
    Array.from(items).forEach((item) => {
        item.addEventListener("click", (e) => e.preventDefault());
    });
}

function getDaysBetween(startDate, endDate) {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const differenceInMs = end - start;

    const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);

    return differenceInDays;
}

// Safe DOM builders (no innerHTML)
function paragraph(...parts) {
    const p = document.createElement("p");
    p.append(...parts);
    return p;
}

function highlight(value) {
    const span = document.createElement("span");
    span.className = "highlight";
    span.textContent = String(value);
    return span;
}

// Eggs
const eggForm = document.getElementById("calculate_eggs");
const outputEgg = document.getElementById("outputEgg");

if (eggForm) {
    eggForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const startDate = new Date(document.getElementById("startDate").value);
        const endDate = new Date(document.getElementById("endDate").value);

        const eggDaily = document.getElementById("eggDaily").value;

        if (endDate < startDate) {
            outputEgg.replaceChildren();
            outputEgg.style.display = "flex";
            outputEgg.innerText = "End date must be after the start date.";
            return;
        }

        const daysBetween = getDaysBetween(startDate, endDate);
        const eggsBetween = daysBetween * eggDaily;

        outputEgg.replaceChildren(
            paragraph(
                `In ${daysBetween} days you have consumed `,
                highlight(eggsBetween),
                " eggs."
            )
        );
        outputEgg.style.display = "flex";
    });
}

// WorkingDays
const workDaysForm = document.getElementById("calculate_workDays");
const outputWork = document.getElementById("outputWork");

if (workDaysForm) {
    workDaysForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const startDate = new Date(document.getElementById("startDate").value);
        const endDate = new Date(document.getElementById("endDate").value);

        if (endDate < startDate) {
            outputWork.replaceChildren();
            outputWork.style.display = "flex";
            outputWork.innerText = "End date must be after the start date.";
            return;
        }

        const workDays = getSelectedWorkDays();

        if (workDays.length === 0) {
            outputWork.replaceChildren();
            outputWork.style.display = "flex";
            outputWork.innerText = "Seems like you did not work at all!";
            return;
        }

        const workdaysCount = countWorkDays(startDate, endDate, workDays);
        const totalWorkedDays = Object.values(workdaysCount).reduce(
            (sum, count) => sum + count,
            0
        );
        const hoursInput = document.getElementById("hoursDaily");
        const dailyHours = hoursInput ? parseInt(hoursInput.value, 10) : 0;
        const hours = dailyHours * totalWorkedDays;

        // Wrapper keeps both lines stacked inside the flex container.
        const result = document.createElement("div");
        result.append(
            paragraph(
                "In this time period you have worked ",
                highlight(totalWorkedDays),
                " days."
            ),
            paragraph(`A total of ${hours} hours.`)
        );
        outputWork.replaceChildren(result);
        outputWork.style.display = "flex";
    });
}

function getSelectedWorkDays() {
    const daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    return daysOfWeek
        .map((day, index) =>
            document.getElementById(day)?.checked ? index : null
        )
        .filter((index) => index !== null);
}

function countWorkDays(start, end, workDays) {
    let workDaysCount = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
        Sunday: 0,
    };

    let currentDate = new Date(start);
    while (currentDate <= end) {
        let dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        if (workDays.includes(dayOfWeek)) {
            let dayName = new Intl.DateTimeFormat("en-US", {
                weekday: "long",
            }).format(currentDate);
            workDaysCount[dayName]++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return workDaysCount;
}
