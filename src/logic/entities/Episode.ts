import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IsDate, Min } from "class-validator";

import Timepoint from "./Timepoint";
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
    public items: AgendaItem[] = [];

    public reviveSubObjects(): void {
        for (const item of this.items) {
            EncodingUtils.reviveObjectAs(item, AgendaItem);
        }
    }

    // taken from here: https://github.com/Ermag/yt-highlights-chrome/blob/master/content.js#L167
    static parseYouTubeTimestamps(text: string): AgendaItem[] {
        const desc = text.split("\n");

        const timeRegex = /([0-9]?[0-9]:)?[0-5]?[0-9]:[0-5][0-9]/g;
        const items: AgendaItem[] = [];

        // Loop trough all lines
        for (let i = 0; i < desc.length; i++) {
            const timestamp = desc[i].match(timeRegex);

            // If there is timestamp in the line extract it
            if (timestamp) {
                let txt = desc[i].replace(timestamp[0], "");
                txt = txt.trim().replace(/(?:https?|ftp):\/\/[\n\S]+/g, "");

                if (txt.length < 2) {
                    continue;
                }

                const removeChars = ["-", "[", "]"];
                for (let k = 0; k < removeChars.length; k++) {
                    // Start of string
                    if (txt.charAt(0) === removeChars[k]) {
                        txt = txt.substr(1);
                    }

                    // End of string
                    if (txt.charAt(txt.length - 1) === removeChars[k]) {
                        txt = txt.substr(0, txt.length - 1);
                    }
                }
                items.push(new AgendaItem(txt, Timepoint.tryParseFromFormattedText(timestamp[0]) as Timepoint));
            }
        }

        // make sure there is always an entry at timepoint 0
        if (items.length > 0 && items[0].timestamp.seconds !== 0) {
            items.unshift(new AgendaItem("", new Timepoint(0)));
        }

        // TODO: make sure the items are sorted correctly based on the timepoints
        return items;
    }
}

@Entity()
export class Episode implements IReviveFromJSON {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column({ nullable: true })
    public external_source?: string;
    @Column({ nullable: true })
    public external_id?: string;
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
    public audioURL!: string;
    @Column()
    public imageURL!: string;
    @Column()
    public owningChannelId!: number;

    public agenda: Agenda = new Agenda();

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
