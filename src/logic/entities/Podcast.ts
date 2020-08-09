import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

import { Episode, AgendaItem } from "./Episode";

export { Episode, AgendaItem };

const convertTitleToURLSection = (title: string) => {
    return title.toLowerCase().replace(/[\s,:&.-]+/g, "-");
};

@Entity()
export class Podcast {
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
    @OneToMany(() => Episode, episode => episode.owningPodcast, { cascade: true })
    public episodes!: Episode[];

    public get titleAsURL(): string {
        return convertTitleToURLSection(this.title);
    }
}
