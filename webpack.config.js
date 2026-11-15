const path = require("node:path");

/**
 * Source maps are only emitted in development: in production they would be
 * served publicly from dist/.
 */
module.exports = (env, argv) => ({
    devtool: argv.mode === "production" ? false : "source-map",
    entry: {
        main: "./src/script/main.js",
    },
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
});
