import { ActionContext } from "vuex";
import { SimpleEventDispatcher, ISimpleEvent } from "ste-simple-events";

import Comment from "@/logic/entities/Comments";
import User from "@/logic/entities/User";
import CommonParams from "@/logic/CommonParams";
import AsyncLoader from "../utils/AsyncLoader";
import { HTTPVerb } from "@/logic/HTTPVerb";
import router from "../router";
import UserSettings from "@/logic/entities/UserSettings";
import EncodingUtils from "@/logic/EncodingUtils";
import Timepoint from "@/logic/entities/Timepoint";
import { UserPlaybackActivity } from "@/logic/UserActivities";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SettingPair = {key: string; value: any};

export class StoreUserViewModel {
    public info: User;
    public showLoginDialog = false;
    public get settingsModifiedEvent(): ISimpleEvent<SettingPair> {
        return this._settingsModifiedEvent.asEvent();
    }
    _episodeIdToPlaybackProgress: Record<number, number>;
    _settingsModifiedEvent: SimpleEventDispatcher<SettingPair>;
    static LOCAL_STORAGE_SETTINGS_KEY = "local_user_settings";
    static LOCAL_STORAGE_PLAYBACK_KEY = "local_playback_settings";
    constructor() {
        this.info = new User();
        this._episodeIdToPlaybackProgress = {};
        this._settingsModifiedEvent = new SimpleEventDispatcher<SettingPair>();
    }

    public getPlaybackProgressForEpisode(episodeId: number): Timepoint {
        return new Timepoint(this._episodeIdToPlaybackProgress[episodeId] || 0);
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

    public loadPlaybackProgress(): Promise<UserPlaybackActivity[]> {
        console.log("Loading playback progress from the server");
        const restURL: string = `${CommonParams.APIServerRootURL}/user/progress`;
        const query_loadPlayback = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null) as Promise<UserPlaybackActivity[]>;
        return query_loadPlayback;
    }

    public async serverStorePlaybackProgress(payload: { episodeId: number; progress: Timepoint }): Promise<void> {
        console.assert(!this.info.isGuest);

        console.log("Saving playback progress on the server");
        const restURL: string = `${CommonParams.APIServerRootURL}/user/progress`;
        const body = {
            episodeId: payload.episodeId,
            progressInSeconds: payload.progress.seconds
        };
        const query_storePlayback = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Post, body) as Promise<void>;
        return query_storePlayback;
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
        internalLoadLocalData: (state: StoreUserViewModel): void => {
            // Also load playback progress
            const storedPlaybackString: string|null = localStorage.getItem(StoreUserViewModel.LOCAL_STORAGE_PLAYBACK_KEY);
            if (storedPlaybackString) {
                state._episodeIdToPlaybackProgress = JSON.parse(storedPlaybackString);
            }

            const storedSettingsString: string|null = localStorage.getItem(StoreUserViewModel.LOCAL_STORAGE_SETTINGS_KEY);
            if (!storedSettingsString) {
                User.guestUser.settings = new UserSettings();
                return;
            }
            const obj = JSON.parse(storedSettingsString);
            EncodingUtils.reviveObjectAs<UserSettings>(obj, UserSettings);
            User.guestUser.settings = obj;
        },
        internalSetActiveUser: (state: StoreUserViewModel, user: User): void => {
            state.info = user;
            // Broadcast that all settings have changed
            for (const key in state.info.settings) {
                const eventPayload = { key, value: (state.info.settings as any)[key] };
                state._settingsModifiedEvent.dispatch(eventPayload);
            }
            console.log("User data loaded for user ", user.id);
        },
        internalSetPlaybackProgress: (state: StoreUserViewModel, episodeProgress: UserPlaybackActivity[]): void => {
            state._episodeIdToPlaybackProgress = {};
            episodeProgress.reduce((map, record) => {
                map[record.episodeId] = record.progressInSeconds;
                return map;
            }, state._episodeIdToPlaybackProgress);
            console.log("User playback progress loaded from the server");
        },
        localSetSettingValue: <T>(state: StoreUserViewModel, payload: { key: string; value: T}): void => {
            const settingsAsAny: any = state.info.settings as any;
            // TODO: Validate settings?
            settingsAsAny[payload.key] = payload.value;
            state.localStoreSettings();
            state._settingsModifiedEvent.dispatch(payload);
        },
        localSavePlaybackProgress: (state: StoreUserViewModel, payload: { episodeId: number; progress: Timepoint}): void => {
            state._episodeIdToPlaybackProgress[payload.episodeId] = payload.progress.seconds;
            const playbackString: string = EncodingUtils.jsonify(state._episodeIdToPlaybackProgress);
            localStorage.setItem(StoreUserViewModel.LOCAL_STORAGE_PLAYBACK_KEY, playbackString);
        },
        setShowLoginDialog: (state: StoreUserViewModel, payload: boolean): void => {
            state.showLoginDialog = payload;
        }
    },
    actions: {
        loadUser: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            context.commit("internalLoadLocalData");
            context.commit("internalSetActiveUser", User.guestUser);
            // TODO: Don't fetch the current user if there's no cookie
            console.log("Fetching user data");
            const restURL: string = `${CommonParams.APIServerRootURL}/user/`;
            const query_loadUser = (AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null, User) as Promise<User>)
                .then(user => {
                    context.commit("internalSetActiveUser", user);
                })
                .catch(reason => {
                    console.error("Failed to load user: ", reason);
                });
            const query_loadUserPlayback = context.state.loadPlaybackProgress()
                .then(episodeProgress => {
                    context.commit("internalSetPlaybackProgress", episodeProgress);
                })
                .catch(reason => {
                    console.error("Failed to load user playback progress: ", reason);
                });
            return Promise.allSettled([query_loadUser, query_loadUserPlayback]) as unknown as Promise<void>;
        },
        loadUserComments: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>, payload: { userId: number}): Promise<Comment[]> => {
            console.log("Loading user comments from the server");
            const restURL: string = `${CommonParams.APIServerRootURL}/comments/user/${payload.userId}`;
            return AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null, Comment) as Promise<Comment[]>;
        },
        login: (_context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            console.log("Sending login request");
            const routeToReturnTo: string = router.currentRoute.fullPath;
            const fullReturnURL: string = encodeURIComponent(`${CommonParams.ClientServerRootURL}/#${routeToReturnTo}`);
            const restURL: string = `${CommonParams.APIServerRootURL}/auth/google/?returnTo=${fullReturnURL}`;
            window.location.href = restURL;
            return Promise.resolve();
        },
        saveSettings: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            context.state.localStoreSettings();
            if (!context.state.info.isGuest) {
                return context.state.serverStoreSettings();
            }
            return Promise.resolve();
        },
        savePlaybackProgress: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>, _payload: { episodeId: number; progress: Timepoint}): Promise<void> => {
            if (!context.state.info.isGuest) {
                // TODO: remporarily commented out to avoid spammy db updates on the server
                // return context.state.serverStorePlaybackProgress(payload);
            }
            return Promise.resolve();
        }
    }
};
