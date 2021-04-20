import Vue from "vue";
import Vuex from "vuex";
import { createDirectStore } from "direct-vuex";

import { default as storePlayModule } from "./StorePlayModule";
import { default as storeUserModule } from "./StoreUserModule";
import { default as storeChannelModule } from "./StoreChannelModule";
import { default as storeDeviceModule } from "./StoreDeviceInfoModule";

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
        play: storePlayModule,
        user: storeUserModule,
        channel: storeChannelModule,
        device: storeDeviceModule
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

// App-specific init of global store
store.state.device.setup();
// store.commit.device.addOnAppModeChangedListener(() => store.commit.play.updateTimeslotCount(store.state.device.device.appMode));
store.commit.play.setup();
