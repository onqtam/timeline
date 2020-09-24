const path = require("path"); // eslint-disable-line

module.exports = {
    lintOnSave: false,
    configureWebpack: {
        devtool: "source-map",
        devServer: {
            disableHostCheck: true,
        }
    },
    // This overrides some default configs of the vue-cli
    // How and why do they work...is hard question to answer, they aren't really documented.
    // This code was produced with a ton of experimentation. Be careful about changing it.
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
