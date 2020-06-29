const convertTitleToURLSection = (title: string) => {
    return title.toLowerCase().replace(/[\s,:&.-]+/g, "-");
};

export class Episode {
    public title: string = "";
    public description: string = "";
    public publicationDate: Date = new Date(0);
    public durationInSeconds: number = 0;
    public audioURL: string = "";
    public imageURL: string = "";

    public get titleAsURL(): string {
        return convertTitleToURLSection(this.title);
    }
}

export class Podcast {
    public title: string = "";
    public description: string = "";
    public author: string = "";
    public link: string = "";
    public imageURL: string = "";
    public episodes: Episode[] = [];

    public get titleAsURL(): string {
        return convertTitleToURLSection(this.title);
    }
}
