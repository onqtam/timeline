import User, { VotedCommentRecord, UserActivity } from "@/logic/User";

export interface IStoreUserModule {
    info: User;
}

export class StoreUserViewModel implements IStoreUserModule {
    public info: User;

    constructor() {
        this.info = new User();
        this.info.shortName = "DEFAULT";
        this.createUser();
    }

    // Should only be called by other modules!
    public recordVote(votedComment: VotedCommentRecord): void {
        // TODO: move to a map and don't bother with management of existing keys
        const record = this.info.activity.votedComments.find(record => record.commentId === votedComment.commentId);
        if (record) {
            record.wasVotePositive = votedComment.wasVotePositive;
        } else {
            this.info.activity.votedComments.push(votedComment);
        }
        this.saveUserToLocalStorage();
    }
    public revertVote(commentId: number): void {
        const recordIndex = this.info.activity.votedComments.findIndex(record => record.commentId === commentId);
        if (recordIndex !== -1) {
            this.info.activity.votedComments.splice(recordIndex, 1);
        }
        this.saveUserToLocalStorage();
    }

    private createUser(): void {
        const dataInStorage = localStorage.getItem("user-info");
        if (dataInStorage !== null) {
            this.loadUserFromJSON(dataInStorage);
        }
    }

    private loadUserFromJSON(json: string): void {
        type RawUserActivity = { votedComments: VotedCommentRecord[] };
        type RawUser = { shortName: string; activity: UserActivity };

        const rawUser = JSON.parse(json);
        this.info.shortName = rawUser.shortName;
        this.info.activity.votedComments = rawUser.activity.votedComments;
    }
    private saveUserToLocalStorage(): void {
        localStorage.setItem("user-info", JSON.stringify(this.info));
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
        recordVote: (state: StoreUserViewModel, votedComment: VotedCommentRecord): void => {
            state.recordVote(votedComment);
        },
        revertVote: (state: StoreUserViewModel, commentId: number): void => {
            state.revertVote(commentId);
        }
    }
};
