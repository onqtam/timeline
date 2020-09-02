import { Entity, OneToMany, PrimaryGeneratedColumn, Column } from 'typeorm';
import VoteCommentRecord from './UserRecords';

@Entity()
export default class UserActivity {
    @PrimaryGeneratedColumn()
    public id!: number;
    // Another bug with TypeORM...inserting an array of default-created UserActivities results in the insertion of only the first one
    // because TypeORM decides they are all the same. This member is set to a random integer in order to make sure TypeORM doesn't do
    // stupid things.
    // TODO: Revisit in a future version of TypeORM
    @Column({nullable: true})
    public internalDBDummyValue!: number;
    @OneToMany(() => VoteCommentRecord, commentRecord => commentRecord.owningActivity, { cascade: true, eager: true })
    public voteRecords!: VoteCommentRecord[];

    // Returns true if the user voted positive, false if the vote was negative, undefined if he hasn't voted
    public getVoteOnComment(commentId: number): boolean|undefined {
        const voteRecord = this.voteRecords.find(record => record.commentId === commentId);
        return voteRecord?.wasVotePositive;
    }
}