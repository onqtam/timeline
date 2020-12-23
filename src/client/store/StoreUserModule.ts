import { ActionContext } from "vuex";
import { SimpleEventDispatcher, ISimpleEvent } from "ste-simple-events";

import User from "@/logic/entities/User";
import VoteCommentRecord from "@/logic/entities/VoteCommentRecord";
import CommonParams from "@/logic/CommonParams";
import AsyncLoader from "../utils/AsyncLoader";
import { HTTPVerb } from "@/logic/HTTPVerb";
import router from "../router";
import UserSettings from "@/logic/entities/UserSettings";
import EncodingUtils from "@/logic/EncodingUtils";
import Timepoint from "@/logic/entities/Timepoint";
import { UserPlaybackActivity } from "@/logic/UserActivities";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IStoreUserModule {
    info: User;
    getPlaybackProgressForEpisode(episodeId: number): Timepoint;
}

export type SettingPair = {key: string; value: any};

export class StoreUserViewModel implements IStoreUserModule {
    public info: User;
    public get settingsModifiedEvent(): ISimpleEvent<SettingPair> {
        return this._settingsModifiedEvent.asEvent();
    }
    private _episodeIdToPlaybackProgress: Record<number, number>;
    private _settingsModifiedEvent: SimpleEventDispatcher<SettingPair>;
    private static LOCAL_STORAGE_SETTINGS_KEY = "local_user_settings";
    private static LOCAL_STORAGE_PLAYBACK_KEY = "local_playback_settings";
    constructor() {
        this.info = new User();
        this._episodeIdToPlaybackProgress = {};
        this._settingsModifiedEvent = new SimpleEventDispatcher<SettingPair>();
    }

    public getPlaybackProgressForEpisode(episodeId: number): Timepoint {
        return new Timepoint(this._episodeIdToPlaybackProgress[episodeId] || 0);
    }

    // Should only be called by other modules!
    public recordVote(votedComment: {commentId: number; wasVotePositive: boolean}): void {
        // TODO: move to a map and don't bother with management of existing keys
        const record = this.info.voteRecords.find(record => record.commentId === votedComment.commentId);
        if (record) {
            console.log("== found and changed!");
            record.wasVotePositive = votedComment.wasVotePositive;
        } else {
            console.log("== pushed!");
            this.info.voteRecords.push(new VoteCommentRecord(votedComment.commentId, this.info.id, 0, votedComment.wasVotePositive));

            console.log(this.info.voteRecords);
        }
    }
    public revertVote(commentId: number): void {
        // TODO: Server-side
        const recordIndex = this.info.voteRecords.findIndex(record => record.commentId === commentId);
        if (recordIndex !== -1) {
            this.info.voteRecords.splice(recordIndex, 1);
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

    public localLoadData(): void {
        // Also load playback progress
        const storedPlaybackString: string|null = localStorage.getItem(StoreUserViewModel.LOCAL_STORAGE_PLAYBACK_KEY);
        if (storedPlaybackString) {
            this._episodeIdToPlaybackProgress = JSON.parse(storedPlaybackString);
        }

        const storedSettingsString: string|null = localStorage.getItem(StoreUserViewModel.LOCAL_STORAGE_SETTINGS_KEY);
        if (!storedSettingsString) {
            User.guestUser.settings = new UserSettings();
            return;
        }
        const obj = JSON.parse(storedSettingsString);
        EncodingUtils.reviveObjectAs<UserSettings>(obj, UserSettings);
        User.guestUser.settings = obj;
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

    public internalSetPlaybackProgress(episodeProgress: UserPlaybackActivity[]): void {
        this._episodeIdToPlaybackProgress = {};
        episodeProgress.reduce((map, record) => {
            map[record.episodeId] = record.progressInSeconds;
            return map;
        }, this._episodeIdToPlaybackProgress);

        console.log("User playback progress loaded from the server");
    }

    public loadPlaybackProgress(): Promise<UserPlaybackActivity[]> {
        console.log("Loading playback progress from the server");
        const restURL: string = `${CommonParams.APIServerRootURL}/user/progress`;
        const query_loadPlayback = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null) as Promise<UserPlaybackActivity[]>;
        return query_loadPlayback;
    }

    public localSavePlaybackProgress(payload: { episodeId: number; progress: Timepoint }): void {
        this._episodeIdToPlaybackProgress[payload.episodeId] = payload.progress.seconds;
        const playbackString: string = EncodingUtils.jsonify(this._episodeIdToPlaybackProgress);
        localStorage.setItem(StoreUserViewModel.LOCAL_STORAGE_PLAYBACK_KEY, playbackString);
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
        localRecordVote: (state: StoreUserViewModel, votedComment: {commentId: number; wasVotePositive: boolean}): void => {
            state.recordVote(votedComment);
        },
        localRevertVote: (state: StoreUserViewModel, commentId: number): void => {
            state.revertVote(commentId);
        },
        internalLoadLocalData: (state: StoreUserViewModel): void => {
            state.localLoadData();
        },
        internalSetActiveUser: (state: StoreUserViewModel, user: User): void => {
            state.internalSetActiveUser(user);
        },
        internalSetPlaybackProgress: (state: StoreUserViewModel, episodeProgress: UserPlaybackActivity[]): void => {
            state.internalSetPlaybackProgress(episodeProgress);
        },
        localSetSettingValue: <T>(state: StoreUserViewModel, payload: { key: string; value: T}): void => {
            state.setSettingValue(payload);
        },
        localSavePlaybackProgress: (state: StoreUserViewModel, payload: { episodeId: number; progress: Timepoint}): void => {
            state.localSavePlaybackProgress(payload);
        }
    },
    actions: {
        loadUser: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            context.commit("internalLoadLocalData");
            context.commit("internalSetActiveUser", User.guestUser);
            // TODO: Don't fetch the current user if there's no cookie
            const query_loadUser = context.state.loadUser()
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
        login: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            return context.state.loginGoogle();
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
                // TODO: remporarilycommented out to avoid spammy db updates on the server
                // return context.state.serverStorePlaybackProgress(payload);
            }
            return Promise.resolve();
        }
    }
};
