const path = require("node:path");

module.exports = (env, argv) => ({
    // No source maps in production: they would be served publicly from dist/.
    devtool: argv.mode === "production" ? false : "source-map",
    entry: {
        main: "./src/script/script",
    },
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
});
