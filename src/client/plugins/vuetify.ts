import Vue from "vue";
import Vuetify from "vuetify";
import "vuetify/dist/vuetify.min.css";

Vue.use(Vuetify);

export default new Vuetify({
    theme: {
        options: {
            customProperties: true
        },
        dark: true,
        // Default init the light theme but still use the dark one because this requires many changes to our LESS
        // TODO: Make Less and SASS work together or get rid of LESS all together
        themes: {
            light: {
                primary: "#ee44aa",
                secondary: "#424242",
                accent: "#82B1FF",
                error: "#FF5252",
                info: "#2196F3",
                success: "#4CAF50",
                warning: "#FFC107"
            }
        }
    }
});
