import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";


// no foreign keys because every vote (insert/update/delete) will trigger a refferential
// integrity check and voting is the most common operation besides fetching the data
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

    constructor(cid: number, uid: number, eid: number, vote: boolean) {
        this.commentId = cid;
        this.userId = uid;
        this.episodeId = eid;
        this.wasVotePositive = vote;
    }
}


