const path = require("path"); // eslint-disable-line

module.exports = {
    lintOnSave: false,
    configureWebpack: {
        devtool: "source-map"
    },
    chainWebpack: config => {
        config
            .entry("app")
            .clear()
            .add("./src/client/main.ts")
            .end();
        config.resolve.alias
            .set("@", path.join(__dirname, "./src/"));
    }
};
