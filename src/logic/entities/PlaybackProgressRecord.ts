import { Entity, Column, PrimaryColumn } from "typeorm";
import Timepoint from "./Timepoint";

@Entity()
export default class PlaybackProgressRecord {
    @PrimaryColumn()
    public userId!: number;
    @PrimaryColumn()
    public episodeId!: number;
    @Column(() => Timepoint)
    public progress!: Timepoint;
}
