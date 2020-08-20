import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import UserActivity from './UserActivity';

@Entity()
export default class VoteCommentRecord {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public commentId!: number;
    @Column()
    public wasVotePositive!: boolean
    @ManyToOne(() => UserActivity, activity => activity.voteRecords, { nullable: false })
    public owningActivity!: UserActivity;
}