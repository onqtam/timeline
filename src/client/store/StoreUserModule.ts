import User from "@/logic/entities/User";
import VoteCommentRecord from "@/logic/entities/UserRecords";
import { ActionContext } from "vuex";
import CommonParams from "@/logic/CommonParams";
import AsyncLoader from "../utils/AsyncLoader";
import { HTTPVerb } from "@/logic/HTTPVerb";
import VueRouter from 'vue-router';
import router from '../router';

export interface IStoreUserModule {
    info: User;
    isAuthenticated: boolean;
}

export class StoreUserViewModel implements IStoreUserModule {
    public info: User;
    public get isAuthenticated(): boolean {
        return Number.isInteger(this.info.id);
    }
    constructor() {
        this.info = new User();
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
        console.log("User data loaded from the server");
    }
    public async loginGoogle(): Promise<void> {
        console.log("Sending login request");
        const routeToReturnTo: string = router.currentRoute.fullPath;
        const fullReturnURL: string = encodeURIComponent(`${CommonParams.ClientServerRootURL}/#${routeToReturnTo}`);
        const restURL: string = `${CommonParams.APIServerRootURL}/auth/google/?returnTo=${fullReturnURL}`;
        window.location.href = restURL;
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
        }
    },
    actions: {
        loadUser: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            return context.state.loadUser()
                .then(user => {
                    context.commit("internalSetActiveUser", user);
                });
        },
        login: (context: ActionContext<StoreUserViewModel, StoreUserViewModel>): Promise<void> => {
            return context.state.loginGoogle();
        }
    }
};
