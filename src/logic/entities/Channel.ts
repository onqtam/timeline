import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

import { Episode, AgendaItem } from "./Episode";
import CommonParams from "../CommonParams";
import EncodingUtils, { IReviveFromJSON } from "../EncodingUtils";

export { Episode, AgendaItem };

@Entity()
export class Channel implements IReviveFromJSON {
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
    @OneToMany(() => Episode, episode => episode.owningChannel, { cascade: true, eager: true })
    public episodes!: Episode[];

    public get titleAsURL(): string {
        return EncodingUtils.titleAsURL(this.title);
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
        for (const episode of this.episodes) {
            EncodingUtils.reviveObjectAs(episode, Episode);
        }
    }
}
