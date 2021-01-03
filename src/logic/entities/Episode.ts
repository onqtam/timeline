import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { IsDate, Min } from "class-validator";

import Timepoint from "./Timepoint";
import { Podcast } from "./Podcast";
import CommonParams from "../CommonParams";
import EncodingUtils, { IReviveFromJSON } from "../EncodingUtils";

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
    // TODO make sure there is always an entry at timepoint 0
    public items: AgendaItem[] = [
        new AgendaItem("agenda 0    beginning", new Timepoint(0)),
        new AgendaItem("agenda 1    abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(400)),
        new AgendaItem("agenda 4    abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(1600)),
        new AgendaItem("agenda 5    abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(2000)),
        new AgendaItem("agenda 7    abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(2800)),
        new AgendaItem("agenda 11   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(4400)),
        new AgendaItem("agenda 12   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(4800)),
        new AgendaItem("agenda 13   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(5200)),
        new AgendaItem("agenda 15   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(6000)),
        new AgendaItem("agenda 19   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(7600)),
        //     new AgendaItem("agenda 20   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(8000)),
        //     new AgendaItem("agenda 21   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(8400)),
        //     new AgendaItem("agenda 22   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(8800)),
        new AgendaItem("agenda 23   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(9200)),
        new AgendaItem("agenda 25   abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz", new Timepoint(10000))
    ];

    public reviveSubObjects(): void {
        for (const item of this.items) {
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
        return EncodingUtils.titleAsURL(this.title);
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
