import Vue from "vue";
import store from "./store";
import vuetifyInstance from "./plugins/vuetify";
import VueTheMask from "vue-the-mask";
import App from "./App.vue";
import router from "./router";
import { installVueRecompute } from "./utils/VueRecompute";

Vue.config.productionTip = false;
Vue.config.devtools = true;

Vue.use(VueTheMask);

installVueRecompute();

// Expose the Vue app as a global var to access it from the console
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).app = new Vue({
    router,
    store: store.original,
    vuetify: vuetifyInstance,
    render: h => h(App)
}).$mount("#app");
