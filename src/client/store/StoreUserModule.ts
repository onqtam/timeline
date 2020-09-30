import { ActionContext } from "vuex";
import { SimpleEventDispatcher, ISimpleEvent } from "ste-simple-events";

import User from "@/logic/entities/User";
import VoteCommentRecord from "@/logic/entities/UserRecords";
import CommonParams from "@/logic/CommonParams";
import AsyncLoader from "../utils/AsyncLoader";
import { HTTPVerb } from "@/logic/HTTPVerb";
import router from "../router";
import UserSettings from "@/logic/entities/UserSettings";
import EncodingUtils from "@/logic/EncodingUtils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IStoreUserModule {
    info: User;
}

export type SettingPair = {key: string; value: any};

export class StoreUserViewModel implements IStoreUserModule {
    public info: User;
    public get settingsModifiedEvent(): ISimpleEvent<SettingPair> {
        return this._settingsModifiedEvent.asEvent();
    }
    private _settingsModifiedEvent: SimpleEventDispatcher<SettingPair>;
    private static LOCAL_STORAGE_SETTINGS_KEY = "local_user_settings";
    constructor() {
        this.info = new User();
        this._settingsModifiedEvent = new SimpleEventDispatcher<SettingPair>();
    }

    // Should only be called by other modules!
    public recordVote(votedComment: {commentId: number; wasVotePositive: boolean}): void {
        // TODO: move to a map and don't bother with management of existing keys
        const record = this.info.activity.voteRecords.find(record => record.commentId === votedComment.commentId);
        if (record) {
            record.wasVotePositive = votedComment.wasVotePositive;
        } else {
            this.info.activity.voteRecords.push(votedComment as unknown as VoteCommentRecord);
        }
    }
    public revertVote(commentId: number): void {
        // TODO: Server-side
        const recordIndex = this.info.activity.voteRecords.findIndex(record => record.commentId === commentId);
        if (recordIndex !== -1) {
            this.info.activity.voteRecords.splice(recordIndex, 1);
        }
    }
    public async loadUser(): Promise<User> {
        console.log("Fetching user data");
        const restURL: string = `${CommonParams.APIServerRootURL}/user/`;
        const query_user = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null, User) as Promise<User>;
        return query_user;
    }
    public internalSetActiveUser(user: User): void {
        this.info = user;
        // Broadcast that all settings have changed
        for (const key in this.info.settings) {
            const eventPayload = { key, value: (this.info.settings as any)[key] };
            this._settingsModifiedEvent.dispatch(eventPayload);
        }
        console.log("User data loaded from the server");
    }
    public async loginGoogle(): Promise<void> {
        console.log("Sending login request");
        const routeToReturnTo: string = router.currentRoute.fullPath;
        const fullReturnURL: string = encodeURIComponent(`${CommonParams.ClientServerRootURL}/#${routeToReturnTo}`);
        const restURL: string = `${CommonParams.APIServerRootURL}/auth/google/?returnTo=${fullReturnURL}`;
        window.location.href = restURL;
    }

    public setSettingValue(payload: { key: string; value: any }): void {
        const settingsAsAny: any = this.info.settings as any;
        // TODO: Validate settings?
        settingsAsAny[payload.key] = payload.value;
        this.localStoreSettings();
        this._settingsModifiedEvent.dispatch(payload);
    }

    public localLoadSettings(): UserSettings {
        const storedSettingsString: string|null = localStorage.getItem(StoreUserViewModel.LOCAL_STORAGE_SETTINGS_KEY);
        if (!storedSettingsString) {
            return new UserSettings();
        }
        const obj = JSON.parse(storedSettingsString);
        EncodingUtils.reviveObjectAs<UserSettings>(obj, UserSettings);
        return obj as UserSettings;
    }

    public localStoreSettings(): void {
        const settingsString: string = EncodingUtils.jsonify(this.info.settings);
        localStorage.setItem(StoreUserViewModel.LOCAL_STORAGE_SETTINGS_KEY, settingsString);
    }

    public async serverStoreSettings(): Promise<void> {
        console.assert(!this.info.isGuest);

        console.log("Saving settings on the server");
        const restURL: string = `${CommonParams.APIServerRootURL}/user/settings`;
        const body = {
            settings: this.info.settings
        };
        const query_storeSettings = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Post, body) as Promise<void>;
        return query_storeSettings;
    }
}

const userModule = new StoreUserViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: userModule,
    mutations: {
        localRecordVote: (state: StoreUserViewModel, votedComment: {commentId: number; wasVotePositive: boolean}): void => {
            state.recordVote(votedComment);
        },
        localRevertVote: (state: StoreUserViewModel, commentId: number): void => {
            state.revertVote(commentId);
        },
        internalSetActiveUser: (state: StoreUserViewModel, user: User): void => {
            state.internalSetActiveUser(user);
        },
        localSetSettingValue: <T>(state: StoreUserViewModel, payload: { key: string; value: T}): void => {
            state.setSettingValue(payload);
        }
    },
    actions: {
        loadUser: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            User.guestUser.settings = context.state.localLoadSettings();
            context.commit("internalSetActiveUser", User.guestUser);
            // TODO: Don't fetch the current user if there's no cookie
            return context.state.loadUser()
                .then(user => {
                    context.commit("internalSetActiveUser", user);
                })
                .catch(reason => {
                    console.error("Failed to load user: ", reason);
                });
        },
        login: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            return context.state.loginGoogle();
        },
        saveSettings: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            context.state.localStoreSettings();
            if (!context.state.info.isGuest) {
                return context.state.serverStoreSettings();
            }
            return Promise.resolve();
        }
    }
};
