import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import UserActivity from './UserActivity';
import EncodingUtils, { IReviveFromJSON } from '../EncodingUtils';

@Entity()
export default class User implements IReviveFromJSON {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public shortName!: string;
    @OneToOne(() => UserActivity)
    @JoinColumn()
    public activity!: UserActivity;

    public reviveSubObjects(): void {
        if (this.activity) {
            EncodingUtils.reviveObjectAs(this.activity, UserActivity);
        }
    }
}
