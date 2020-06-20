export type VotedCommentRecord = { commentId: number; wasVotePositive: boolean };
export class UserActivity {
    public votedComments: VotedCommentRecord[] = [];

    // Returns true if the user voted positive, false if the vote was negative, undefined if he hasn't voted
    public getVoteOnComment(commentId: number): boolean|undefined {
        const voteRecord = this.votedComments.find(record => record.commentId === commentId);
        return voteRecord?.wasVotePositive;
    }
}

export default class User {
    public shortName: string = "";
    public activity: UserActivity = new UserActivity();
}
