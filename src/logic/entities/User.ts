import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Index, getConnection } from "typeorm";
import { IsEmail } from "class-validator";
import UserActivity from "./UserActivity";
import EncodingUtils, { IReviveFromJSON } from "../EncodingUtils";
import CommonParams from '../CommonParams';

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
    @OneToOne(() => UserActivity)
    @JoinColumn()
    public activity!: UserActivity;

    public get isGuest(): boolean {
        return this.email === GUEST_USER_EMAIL;
    }

    public reviveSubObjects(): void {
        if (this.activity) {
            EncodingUtils.reviveObjectAs(this.activity, UserActivity);
        }
    }

    public static get guestUser(): User {
        return this._guestUser;
    }

    public static async initGuestUser(): Promise<void> {
        if (CommonParams.IsRunningOnClient) {
            this._guestUser = User.createGuestUser();
        } else {
            const defaultUser: User = this.createGuestUser();
            this._guestUser = (await getConnection()
                .createQueryBuilder(User, "user")
                .where(`"user"."email" = :email`, defaultUser)
                .getOne())!;
        }
    }

    // TODO: Check the server doesn't let the guest user to do anything!
    public static createGuestUser(): User {
        const user = new User();
        user.shortName = "Guest";
        user.email = "guest@guest.guest";
        user.activity = new UserActivity();
        user.activity.voteRecords = [];
        return user;
    }

    private static _guestUser: User;
}
