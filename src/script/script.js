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
            outputEgg.innerHTML = "";
            outputEgg.style.display = "flex";
            outputEgg.innerText = "End date must be after the start date.";
            return;
        }

        const daysBetween = getDaysBetween(startDate, endDate);
        const eggsBetween = daysBetween * eggDaily;

        outputEgg.innerHTML = "";
        outputEgg.style.display = "flex";
        const outputText = document.createElement("p");
        outputText.innerHTML = `
            In ${daysBetween} days you have consumed <span class="highlight">${eggsBetween}</span> eggs.
        `;
        outputEgg.appendChild(outputText);
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
            outputWork.innerHTML = "";
            outputWork.style.display = "flex";
            outputWork.innerText = "End date must be after the start date.";
            return;
        }

        const workDays = getSelectedWorkDays();

        if (workDays.length === 0) {
            outputWork.innerHTML = "";
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

        outputWork.innerHTML = "";
        outputWork.style.display = "flex";
        const outputText = document.createElement("p");
        outputText.innerHTML = `
            <p>In this time period you have worked <span class="highlight">${totalWorkedDays}</span> days.</p>
            <p>A total of ${hours} hours.</p>
        `;
        outputWork.appendChild(outputText);
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
