import Vue from "vue";
import Vuex from "vuex";
import { createDirectStore } from "direct-vuex";

import { default as storeListenModule } from "./StoreListenModule";
import { default as storeUserModule } from "./StoreUserModule";

Vue.use(Vuex);

// Use direct-vuex to enable typescript to work with Vuex
const {
    store,
    rootActionContext,
    moduleActionContext,
    rootGetterContext,
    moduleGetterContext
} = createDirectStore({
    modules: {
        listen: storeListenModule,
        user: storeUserModule
    },
    strict: true
});

// Export the direct-store instead of the classic Vuex store.
export default store;

// The following exports will be used to enable types in the
// implementation of actions and getters.
export {
    rootActionContext,
    moduleActionContext,
    rootGetterContext,
    moduleGetterContext
};

// The following lines enable types in the injected store '$store'.
/* eslint @typescript-eslint/interface-name-prefix: "off" */
export type AppStore = typeof store
declare module "vuex" {
    interface Store<S> {
        direct: AppStore;
    }
};
