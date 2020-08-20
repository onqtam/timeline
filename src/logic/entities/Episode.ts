import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { IsDate, Min } from "class-validator";

import Timepoint from "./Timepoint";
import { Podcast } from "./Podcast";
import CommonParams from '../CommonParams';
import EncodingUtils, { IReviveFromJSON } from '../EncodingUtils';

const convertTitleToURLSection = (title: string) => {
    return title.toLowerCase().replace(/[\s,:&.-]+/g, "-");
};
export class AgendaItem implements IReviveFromJSON {
    public timestamp: Timepoint = new Timepoint(0);
    public text: string = "";

    constructor(text: string, timestamp: Timepoint) {
        this.timestamp = timestamp;
        this.text = text;
    }
    public reviveSubObjects(): void {
        this.timestamp = new Timepoint(this.timestamp.seconds);
    }
}

export class Agenda implements IReviveFromJSON {
    public items: AgendaItem[] = [];

    public reviveSubObjects(): void {
        for (let item of this.items) {
            EncodingUtils.reviveObjectAs(item, AgendaItem);
        }
    }
}

@Entity()
export class Episode implements IReviveFromJSON {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public title!: string;
    @Column()
    public description!: string;
    @Column()
    @IsDate()
    public publicationDate!: Date;
    @Column()
    @Min(1)
    public durationInSeconds!: number;
    @Column()
    public audioURL!: string ;
    @Column()
    public imageURL!: string;
    public agenda: Agenda = new Agenda();

    @ManyToOne(() => Podcast, podcast => podcast.episodes, { nullable: false })
    public readonly owningPodcast!: Podcast;

    public get titleAsURL(): string {
        return convertTitleToURLSection(this.title);
    }
    constructor() {
        if (CommonParams.IsRunningOnClient) {
            this.id = -1;
            this.title = "";
            this.description = "";
            this.publicationDate = new Date(0);
            this.durationInSeconds = 1;
            this.audioURL = "";
            this.imageURL = "";
        }
    }

    public reviveSubObjects(): void {
        this.publicationDate = new Date(this.publicationDate);
        // TODO: This might be null only because the agenda isn't stored in the DB currently
        if (this.agenda) {
            EncodingUtils.reviveObjectAs(this.agenda, Agenda);
        } else {
            this.agenda = new Agenda();
        }
    }
}
