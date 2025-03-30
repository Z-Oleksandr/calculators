const path = require("path");

module.exports = {
    devtool: "source-map",
    entry: {
        main: "./src/script/script",
    },
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
    },
};
