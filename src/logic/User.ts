export class UserActivity {
    public votedComments: { commentId: number; wasVotePositive: boolean }[] = [];
}
export default class User {
    public shortName: string = "";
    public activity: UserActivity = new UserActivity();
}
