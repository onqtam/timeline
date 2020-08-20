import { Entity, Tree, PrimaryGeneratedColumn, Column, TreeChildren, ColumnOptions, ValueTransformer, TreeParent, ManyToOne } from 'typeorm';
import { Min, IsDate } from 'class-validator';
import Timepoint from "./Timepoint";
import User from './User';

@Entity()
@Tree("closure-table")
export default class Comment {
    @PrimaryGeneratedColumn()
    public id!: number;
    @ManyToOne(() => User)
    public author!: User;
    @Column()
    public content!: string;
    @Column()
    @IsDate()
    public date!: Date;
    @Column()
    @Min(0)
    public upVotes: number = 0;
    @Column()
    @Min(0)
    public downVotes: number = 0;
    @Column(type => Timepoint)
    public timepoint!: Timepoint;
    @TreeChildren()
    public replies!: Comment[];
    // TypeORM bug 123: We don't need to know the parentComment...but TypeORM does (even though it has all the information already)
    @TreeParent()
    public parentComment!: Comment;

    public get hasReplies(): boolean {
        return this.replies && this.replies.length !== 0;
    }

    public get totalVotes(): number {
        return this.upVotes - this.downVotes;
    }

    public formatApprovalRating(): string {
        const voteCount = this.upVotes + this.downVotes;
        if (voteCount === 0) {
            return "100%";
        }
        const approvalPercentage = 100 * this.upVotes / voteCount;
        return approvalPercentage.toFixed(0) + "%";
    }
}
