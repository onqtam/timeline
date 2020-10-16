import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, Index, PrimaryColumn } from "typeorm";
import { Episode } from './Podcast';
import Timepoint from './Timepoint';
import User from './User';


@Entity()
export default class PlaybackProgressRecord {
    @PrimaryColumn()
    public userId!: number;
    @PrimaryColumn()
    public episodeId!: number;
    @Column(() => Timepoint)
    public progress!: Timepoint;
}
