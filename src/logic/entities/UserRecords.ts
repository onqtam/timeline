import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import UserActivity from './UserActivity';
import { IReviveFromJSON } from '../EncodingUtils';

@Entity()
export default class VoteCommentRecord {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public commentId!: number;
    @Column()
    public wasVotePositive!: boolean
    // SERVER-ONLY
    @ManyToOne(() => UserActivity, activity => activity.voteRecords, { nullable: false })
    public owningActivity!: UserActivity;
}