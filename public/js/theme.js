(function () {
    const root = document.documentElement;
    root.classList.add("js");

    function storedTheme() {
        try {
            return localStorage.getItem("theme");
        } catch {
            return null;
        }
    }

    const theme = storedTheme();
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
})();
