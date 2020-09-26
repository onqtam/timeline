import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Index } from "typeorm";
import { IsEmail } from "class-validator";
import UserActivity from "./UserActivity";
import EncodingUtils, { IReviveFromJSON } from "../EncodingUtils";

@Entity()
export default class User implements IReviveFromJSON {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public shortName!: string;
    @Column()
    @IsEmail()
    public email!: string;
    @Column({ type: "varchar", nullable: true })
    @Index({ unique: true })
    public externalProviderId!: string|null;
    @OneToOne(() => UserActivity)
    @JoinColumn()
    public activity!: UserActivity;

    public reviveSubObjects(): void {
        if (this.activity) {
            EncodingUtils.reviveObjectAs(this.activity, UserActivity);
        }
    }
}
