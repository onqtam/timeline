import Timepoint from "./Timepoint";

export class Episode {
    public title: string = "";
    public description: string = "";
    public publicationDate: Date = new Date(0);
    public durationInSeconds: number = 0;
    public audioURL: string = "";
    public imageURL: string = "";
}

export class Podcast {
    public title: string = "";
    public description: string = "";
    public author: string = "";
    public link: string = "";
    public imageURL: string = "";
    public episodes: Episode[] = [];

    public static parsePodcastFromRSS(rssContent: string): Podcast | null {
        const podcast = new Podcast();
        // TODO: Move to the server?
        // Check we are running in the browser
        console.assert(window.DOMParser !== undefined);
        const xmlParser = new DOMParser();
        const xmlDoc = xmlParser.parseFromString(rssContent, "text/xml");
        if (xmlDoc.querySelector("parsererror")) {
            console.error("Parsing RSS Failed. Reason: ", xmlDoc.querySelector("parsererror div")?.textContent);
            return null;
        }
        const channel = xmlDoc.querySelector("channel");
        if (!channel) {
            console.error("Can't parse RSS - doesn't have channel node");
            return null;
        }
        // The code below loads various nodes & attributes from the rss xml
        // into the podcast data structure.

        // The "// usually" comments denote places where elements are under a namespace
        // CSS selectors don't support namespaces so they just fetch any element of the same tag, regardless of NS
        // so they work fine even though it looks wrong

        podcast.title = this.guaranteeLoadText(channel, "title");
        podcast.description = this.guaranteeLoadText(channel, "description");
        podcast.author = this.guaranteeLoadText(channel, "author"); // usually itunes:author
        podcast.link = this.guaranteeLoadText(channel, "link");
        podcast.imageURL = this.guaranteeLoadText(channel, "image url");

        const episodeNodes = channel.querySelectorAll("item");
        for (const episodeItem of episodeNodes) {
            const episode = new Episode();

            episode.title = this.guaranteeLoadText(episodeItem, "title");
            episode.description = this.guaranteeLoadText(episodeItem, "description");
            episode.publicationDate = new Date(this.guaranteeLoadText(episodeItem, "pubDate"));
            const durationText: string = this.guaranteeLoadText(episodeItem, "duration"); // usually itunes:author
            const asTimepoint: Timepoint|null = Timepoint.tryParseFromFormattedText(durationText);
            if (!asTimepoint) {
                console.error("Failed to parse duration of episode with title: ", episode.title);
                continue;
            }
            episode.durationInSeconds = asTimepoint.seconds;
            episode.audioURL = this.guaranteeLoadAttr(episodeItem, "enclosure", "url");
            episode.imageURL = this.guaranteeLoadAttr(episodeItem, "image", "href");

            podcast.episodes.push(episode);
        }
        return podcast;
    }

    private static guaranteeLoadText(element: Element, childSelector: string): string {
        const value = element.querySelector(childSelector)?.textContent;
        console.assert(value !== undefined && value !== null);
        return value!;
    }
    private static guaranteeLoadAttr(element: Element, childSelector: string, attributeName: string): string {
        const attr = element.querySelector(childSelector)?.attributes.getNamedItem(attributeName);
        console.assert(attr !== undefined && attr !== null);
        return attr!.textContent!;
    }
}
