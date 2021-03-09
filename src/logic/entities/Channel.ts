import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

import { Episode, AgendaItem } from "./Episode";
import CommonParams from "../CommonParams";
import EncodingUtils from "../EncodingUtils";

export { Episode, AgendaItem };

@Entity()
export class Channel {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column({nullable: true})
    public external_source?: string;
    @Column({nullable: true})
    public external_id?: string;
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
        }
    }
}
