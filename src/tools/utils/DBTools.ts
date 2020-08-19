import { getConnectionOptions, Connection, createConnection, getConnection } from "typeorm";
import xmldom from "xmldom";
import pgtools from "pgtools";

import { Podcast, Episode, AgendaItem } from "../../logic/entities/Podcast";
import Timepoint from "../../logic/Timepoint";
import AsyncLoader from "./AsyncLoader";
import { RandomString } from "../../logic/RandomHelpers";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

class ElementParserHelper {
    public element: Element;

    constructor(element: Element) {
        this.element = element;
    }
    public getText(): string {
        return this.element.textContent!;
    }
    public getAttr(attr: string): string {
        return this.element.attributes.getNamedItem(attr)!.textContent!;
    }

    public hasChildOf = (tagName: string): boolean => {
        const allChildren = this.element.getElementsByTagNameNS("*", tagName);
        return allChildren.length > 0;
    };

    public firstChild = (tagName: string): ElementParserHelper => {
        const allChildren = this.element.getElementsByTagNameNS("*", tagName);
        console.assert(allChildren.length > 0);
        return new ElementParserHelper(allChildren[0]);
    };

    public allChildren = (tagName: string): ElementParserHelper[] => {
        const allChildren = this.element.getElementsByTagNameNS("*", tagName);
        // For some reason Array.from returns the list in reversed order so fix it back
        return Array.from(allChildren).reverse().map(el => new ElementParserHelper(el));
    };
}

function parsePodcastFromRSS(rssContent: string): Podcast | null {
    const podcast = new Podcast();
    const xmlParser = new xmldom.DOMParser();
    const xmlDoc = xmlParser.parseFromString(rssContent, "text/xml");
    const docHelper = new ElementParserHelper(xmlDoc.documentElement);
    if (docHelper.hasChildOf("parsererror")) {
        console.error("Parsing RSS Failed. Reason: ", docHelper.firstChild("parseError").firstChild("div").getText());
        return null;
    }
    const channel = docHelper.firstChild("channel");
    if (!channel) {
        console.error("Can't parse RSS - doesn't have channel node");
        return null;
    }
    // The code below loads various nodes & attributes from the rss xml
    // into the podcast data structure.

    // The "// usually" comments denote places where elements are under a namespace
    // CSS selectors don't support namespaces so they just fetch any element of the same tag, regardless of NS
    // so they work fine even though it looks wrong

    podcast.title = channel.firstChild("title").getText();
    podcast.description = channel.firstChild("description").getText();
    podcast.author = channel.firstChild("author").getText(); // usually itunes:author
    podcast.link = channel.firstChild("link").getText();
    podcast.imageURL = channel.firstChild("image").getAttr("href");

    podcast.episodes = [];
    const episodeNodes = channel.allChildren("item");
    for (const episodeItem of episodeNodes) {
        const episode = new Episode();

        episode.owningPodcast = podcast;
        episode.title = episodeItem.firstChild("title").getText();
        episode.description = episodeItem.firstChild("description").getText();
        episode.publicationDate = new Date(episodeItem.firstChild("pubDate").getText());
        const durationText: string = episodeItem.firstChild("duration").getText(); // usually itunes:author
        const asTimepoint: Timepoint|null = Timepoint.tryParseFromFormattedText(durationText);
        if (!asTimepoint) {
            console.error("Failed to parse duration of episode with title: ", episode.title);
            continue;
        }
        episode.durationInSeconds = asTimepoint.seconds;
        episode.audioURL = episodeItem.firstChild("enclosure").getAttr("url");
        episode.imageURL =episodeItem.firstChild("image").getAttr("href");

        // podcasts don't yet gave actual agenda so generate a random one
        // new item every X +- Y seconds
        const AGENDA_ITEM_INTERVAL = 600; // 10mins
        const AGENDA_ITEM_DEVIATION = 180; // with a deviation of 3mins
        const nextItemTime = (currentTime: number) => currentTime + AGENDA_ITEM_INTERVAL + (Math.random() - 0.5) * AGENDA_ITEM_DEVIATION;
        for (let i = 0; i < episode.durationInSeconds; i = nextItemTime(i)) {
            const item = new AgendaItem(RandomString.ofLength(30), new Timepoint(i));
            episode.agenda.items.push(item);
        }
        podcast.episodes.push(episode);
    }
    return podcast;
};

async function downloadAllRss(): Promise<Podcast[]> {
    const onFetchFailed = async (): Promise<Podcast> => {
        return Promise.reject(new Error("Download failed!"));
    };
    const parseWithPromise = async (rssContent: string): Promise<Podcast> => {
        const parsedPodcast: Podcast | null = parsePodcastFromRSS(rssContent);
        if (parsedPodcast) {
            return parsedPodcast;
        } else {
            return Promise.reject(new Error("Parsing failed!"));
        }
    };

    const PODCAST_TO_RSS: Record<string, string> = {
        "the-portal": "https://rss.art19.com/the-portal"
    };
    // Fire all requests at once, wait and process sequentially after that
    const promises: Promise<Podcast>[] = [];
    for (const podcast in PODCAST_TO_RSS) {
        const rssPromise = AsyncLoader.fetchTextFile(PODCAST_TO_RSS[podcast]).then(parseWithPromise, onFetchFailed);
        promises.push(rssPromise);
    }
    return Promise.all(promises);
};

async function createDevTestDBIfNecessary(): Promise<string> {
    const ormOpts: PostgresConnectionOptions = await getConnectionOptions() as PostgresConnectionOptions;
    const config = {
        user: ormOpts.username as string,
        password: ormOpts.password as string,
        port: ormOpts.port!,
        host: ormOpts.host!
    };
    return pgtools.createdb(config, ormOpts.database!);
};

export default class DBTools {
    static async initDatabaseConnection(): Promise<Connection> {
        let connection: Connection;
        try {
            connection = await createConnection();
        } catch (error) {
            if (error.code === "3D000") {
                // Database doesn't exist.
                // PG error code ref: https://docstore.mik.ua/manuals/sql/postgresql-8.2.6/errcodes-appendix.html
                console.log("Database does not exist, creating it");
                await createDevTestDBIfNecessary();
                connection = await createConnection();
                console.log("Connection established");
            } else {
                throw error;
            }
        }
        return connection;
    }

    static async updatePodcastInfo(): Promise<void> {
        console.log("Fetching latest data");
        const allPodcasts: Promise<Podcast[]> = downloadAllRss();

        const connection: Connection = getConnection();
        console.log("Deleting existing data");
        // Can't execute the deletions in parallel - deleting a podcast without deleting its episodes firsts
        // will cause the FKs to become null and which will fail validation
        await connection.createQueryBuilder()
            .delete()
            .from(Episode)
            .execute();
        await connection.createQueryBuilder()
            .delete()
            .from(Podcast)
            .execute();

        const parsedPodcasts: Podcast[] = await allPodcasts;

        console.log("Inserting new data");
        // Can't execute the insertions in parallel - podcasts need to be inserted first so that their PKs are generated.
        // Otherwise inserting the episodes will insert null FKs for podcastOwner
        await connection.createQueryBuilder()
            .insert()
            .into(Podcast)
            .values(parsedPodcasts)
            .execute();
        const allEpisodes = parsedPodcasts.flatMap(p => p.episodes);
        await connection.createQueryBuilder()
            .insert()
            .into(Episode)
            .values(allEpisodes)
            .execute();
        console.log("Update complete");
    }
}
