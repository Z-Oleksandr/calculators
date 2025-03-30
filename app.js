require("dotenv").config();
const express = require("express");
const path = require("path");
const expressLayout = require("express-ejs-layouts");

const helmet = require("helmet");
const compression = require("compression");

const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 3030;

const app = express();

app.use(helmet());
app.use(compression());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.urlencoded({ extended: true }));

app.use(expressLayout);
app.set("layout", path.join(__dirname, "src/views/layouts/main"));
app.set("views", path.join(__dirname, "src/views"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index", { title: "Home" });
});

app.get("/about", (req, res) => {
    res.render("about", { title: "About" });
});

app.get("/workCalc", (req, res) => {
    res.render("workingDays", { title: "Working days" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
