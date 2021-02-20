import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { IsDate } from "class-validator";

@Entity()
export default class VoteCommentRecord {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public commentId!: number;
    @Column()
    public episodeId!: number;
    @Column()
    public userId!: number;
    @Column()
    public wasVotePositive!: boolean
    @Column()
    @IsDate()
    public date!: Date;

    constructor(cid: number, uid: number, eid: number, vote: boolean) {
        this.commentId = cid;
        this.userId = uid;
        this.episodeId = eid;
        this.wasVotePositive = vote;
        this.date = new Date();
    }
}
