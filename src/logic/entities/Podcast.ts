import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

import { Episode, AgendaItem } from "./Episode";
import { timeStamp } from 'console';
import { isUndefined } from 'util';
import CommonParams from '../CommonParams';
import EncodingUtils, { IReviveFromJSON } from '../EncodingUtils';

export { Episode, AgendaItem };

const convertTitleToURLSection = (title: string) => {
    return title.toLowerCase().replace(/[\s,:&.-]+/g, "-");
};

@Entity()
export class Podcast implements IReviveFromJSON {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public title!: string;
    @Column()
    public description!: string;
    @Column()
    public author!: string;
    @Column()
    public link!: string;
    @Column()
    public imageURL!: string;
    @OneToMany(() => Episode, episode => episode.owningPodcast, { cascade: true, eager: true })
    public episodes!: Episode[];

    public get titleAsURL(): string {
        return convertTitleToURLSection(this.title);
    }

    constructor() {
        if (CommonParams.IsRunningOnClient) {
            this.id = -1;
            this.title = "";
            this.description = "";
            this.author = "";
            this.link = "";
            this.imageURL = "";
            this.episodes = [];
        }
    }

    public reviveSubObjects(): void {
        // We only need to update the prototypes of our episodes
        for (let episode of this.episodes) {
            EncodingUtils.reviveObjectAs(episode, Episode);
        }
    }
}
