"use strict";

const path = require("node:path");
const express = require("express");
const expressLayout = require("express-ejs-layouts");
const helmet = require("helmet");
const compression = require("compression");

const PORT = Number(process.env.PORT) || 3030;
const isProd = process.env.NODE_ENV === "production";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());

const staticOptions = {
    maxAge: isProd ? "1d" : 0,
    index: false,
    redirect: false,
};
app.use(express.static(path.join(__dirname, "public"), staticOptions));
app.use(express.static(path.join(__dirname, "dist"), staticOptions));

app.use(expressLayout);
app.set("layout", path.join(__dirname, "src/views/layouts/main"));
app.set("views", path.join(__dirname, "src/views"));
app.set("view engine", "ejs");

app.get("/healthz", (req, res) => {
    res.set("Cache-Control", "no-store").type("text/plain").send("ok");
});

app.get("/", (req, res) => {
    res.render("index", { title: "Home" });
});

app.get("/about", (req, res) => {
    res.render("about", { title: "About" });
});

app.get("/workCalc", (req, res) => {
    res.render("workingDays", { title: "Working days" });
});

app.use((req, res) => {
    res.status(404).type("text/plain").send("Not found");
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).type("text/plain").send("Internal server error");
});

const server = app.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`Server running on port ${PORT}`);
});

// Slow-client protection (Node defaults are generous).
server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 5_000;

function shutdown(signal) {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
