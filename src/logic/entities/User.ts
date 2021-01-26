import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Index, getConnection } from "typeorm";
import { IsEmail } from "class-validator";
import VoteCommentRecord from "./VoteCommentRecord";
import EncodingUtils, { IReviveFromJSON } from "../EncodingUtils";
import CommonParams from "../CommonParams";
import UserSettings from "./UserSettings";

const GUEST_USER_EMAIL: string = "guest@guest.guest";

@Entity()
export default class User implements IReviveFromJSON {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public shortName!: string;
    @Column()
    @Index({ unique: true })
    @IsEmail()
    public email!: string;
    @Column({ type: "varchar", nullable: true })
    @Index({ unique: true })
    public externalProviderId!: string|null;
    @OneToOne(() => UserSettings)
    @JoinColumn()
    public settings!: UserSettings;

    public voteRecords!: VoteCommentRecord[];
    // Returns true if the user voted positive, false if the vote was negative, undefined if he hasn't voted
    public getVoteOnComment(commentId: number): boolean|undefined {
        const voteRecord = this.voteRecords.find(record => record.commentId === commentId);

        if (voteRecord?.wasVotePositive === true) {
            console.log("== OMGGG TRUE", commentId);
        }

        return voteRecord?.wasVotePositive;
    }

    public get isGuest(): boolean {
        return this.email === GUEST_USER_EMAIL;
    }

    public reviveSubObjects(): void {
        if (this.settings) {
            EncodingUtils.reviveObjectAs(this.settings, UserSettings);
        }
    }

    public static get guestUser(): User {
        return this._guestUser;
    }
    public static get deletedUser(): User {
        return this._deletedUser;
    }

    public static deletedUserId = -1;
    public static deletedUserName = "[Deleted]";

    public static async initSpecialUsers(): Promise<void> {
        console.log(" ====  initSpecialUsers ====== ");
        if (CommonParams.IsRunningOnClient) {
            this._guestUser = User.createGuestUser();
            this._deletedUser = User.createDeletedUser();
        } else {
            const defaultGuest: User = this.createGuestUser();
            this._guestUser = (await getConnection()
                .createQueryBuilder(User, "user")
                .where(`"user"."email" = :email`, defaultGuest)
                .getOne())!;

            const defaultDeleted: User = this.createDeletedUser();
            this._deletedUser = (await getConnection()
                .createQueryBuilder(User, "user")
                .where(`"user"."email" = :email`, defaultDeleted)
                .getOne())!;

            // TODO: this is still undefined - we never insert the deleted user - we just ask for him here.
            // perhaps we don't need a deleted user in the DB at all? maybe just use -1 for the userId and remove the foreign keys...
            console.log(this._deletedUser);
        }
    }

    // TODO: Check the server doesn't let the guest user to do anything!
    public static createGuestUser(): User {
        const user = new User();
        user.id = -2;
        user.shortName = "Guest";
        user.email = "guest@guest.guest";
        user.settings = new UserSettings();
        return user;
    }

    // TODO: Check the server doesn't let the deleted user to do anything!
    public static createDeletedUser(): User {
        const user = new User();
        user.id = -1;
        user.shortName = "deleted";
        user.email = "deleted@deleted.deleted";
        user.settings = new UserSettings();
        return user;
    }

    private static _guestUser: User;
    private static _deletedUser: User;
}
