import User from "@/logic/User";

export interface IStoreUserModule {
    info: User;
}

export class StoreUserViewModel implements IStoreUserModule {
    public info: User;

    constructor() {
        this.info = new User();
        this.info.shortName = "DEFAULT";
    }
}

const userModule = new StoreUserViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: userModule
};
