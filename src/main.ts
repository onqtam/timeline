import Vue from "vue";
import store from "./store";
import App from "./App.vue";
import router from "./router";

Vue.config.productionTip = false;
Vue.config.devtools = true;

new Vue({
    router,
    store: store.original,
    render: h => h(App)
}).$mount("#app");
