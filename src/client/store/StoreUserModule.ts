import User from "@/logic/entities/User";
import VoteCommentRecord from '@/logic/entities/UserRecords';
import UserActivity from '@/logic/entities/UserActivity';

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
    public recordVote(votedComment: VoteCommentRecord): void {
        // TODO: move to a map and don't bother with management of existing keys
        const record = this.info.activity.voteRecords.find(record => record.commentId === votedComment.commentId);
        if (record) {
            record.wasVotePositive = votedComment.wasVotePositive;
        } else {
            this.info.activity.voteRecords.push(votedComment);
        }
        this.saveUserToLocalStorage();
    }
    public revertVote(commentId: number): void {
        const recordIndex = this.info.activity.voteRecords.findIndex(record => record.commentId === commentId);
        if (recordIndex !== -1) {
            this.info.activity.voteRecords.splice(recordIndex, 1);
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
        type RawUserActivity = { votedComments: VoteCommentRecord[] };
        type RawUser = { shortName: string; activity: UserActivity };

        const rawUser = JSON.parse(json);
        this.info.shortName = rawUser.shortName;
        this.info.activity.voteRecords = rawUser.activity.votedComments;
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
        recordVote: (state: StoreUserViewModel, votedComment: VoteCommentRecord): void => {
            state.recordVote(votedComment);
        },
        revertVote: (state: StoreUserViewModel, commentId: number): void => {
            state.revertVote(commentId);
        }
    }
};
