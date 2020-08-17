import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { IsDate, Min } from "class-validator";

import Timepoint from "../Timepoint";
import { Podcast } from "./Podcast";

const convertTitleToURLSection = (title: string) => {
    return title.toLowerCase().replace(/[\s,:&.-]+/g, "-");
};
export class AgendaItem {
    public timestamp: Timepoint = new Timepoint(0);
    public text: string = "";

    constructor(text: string, timestamp: Timepoint) {
        this.timestamp = timestamp;
        this.text = text;
    }
}

export class Agenda {
    public items: AgendaItem[] = [];
}

@Entity()
export class Episode {
    @PrimaryGeneratedColumn()
    public id: number = -1;
    @Column()
    public title: string = "";
    @Column()
    public description: string = "";
    @Column()
    @IsDate()
    public publicationDate: Date = new Date();
    @Column()
    @Min(1)
    public durationInSeconds: number = -1;
    @Column()
    public audioURL: string = "";
    @Column()
    public imageURL: string = "";
    public agenda: Agenda = new Agenda();

    @ManyToOne(() => Podcast, podcast => podcast.episodes, { nullable: false })
    public owningPodcast!: Podcast;

    public get titleAsURL(): string {
        return convertTitleToURLSection(this.title);
    }
}
