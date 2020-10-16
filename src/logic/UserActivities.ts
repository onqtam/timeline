// NB: Do not confuse with UserActivity, this file is intended to replace the UserActivity which currently
// adds a ton of overhead to all user-related SQL queries
export class UserPlaybackActivity {
    public episodeId!: number;
    public progressInSeconds!: number;
}
