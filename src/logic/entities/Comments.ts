import { Entity, Tree, PrimaryGeneratedColumn, Column, TreeChildren, TreeParent } from "typeorm";
import { Min, IsDate } from "class-validator";
import Timepoint from "./Timepoint";
import EncodingUtils from "../EncodingUtils";
import CommonParams from "../CommonParams";

@Entity()
@Tree("materialized-path")
export default class Comment {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public episodeId!: number;
    @Column()
    public userId!: number;
    // this is duplicating the user name for the user id so that a join can be avoided
    @Column()
    public userName!: string;
    @Column()
    public content!: string;
    @Column()
    @IsDate()
    public date_added!: Date;
    @Column()
    @IsDate()
    public date_modified!: Date;
    @Column()
    @Min(0)
    public upVotes: number = 0;
    @Column()
    @Min(0)
    public downVotes: number = 0;
    @Column(() => Timepoint)
    public timepoint!: Timepoint;
    @TreeChildren()
    public replies!: Comment[];
    // SERVER SIDE ONLY
    // TypeORM bug 123: We don't need to know the parentComment...but TypeORM does (even though it has all the information already)
    // EDIT: actually knowing the parentComment is not that bad at all - in theory we should be able to live with only the parent and no children
    @TreeParent()
    public parentComment!: Comment;

    public static deletedCommentContents = "[Deleted]";

    constructor() {
        if (CommonParams.IsRunningOnClient) {
            this.id = -1;
            this.content = "";
            this.date_added = new Date();
            this.date_modified = new Date();
            this.upVotes = 0;
            this.downVotes = 0;
            this.timepoint = new Timepoint();
            this.replies = [];
        }
    }

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

    public reviveSubObjects(): void {
        this.date_added = new Date(this.date_added);
        this.date_modified = new Date(this.date_modified);
        this.timepoint = new Timepoint(this.timepoint.seconds);
        if (this.replies) {
            for (const reply of this.replies) {
                EncodingUtils.reviveObjectAs(reply, Comment);
            }
        } else {
            this.replies = [];
        }
    }
}
