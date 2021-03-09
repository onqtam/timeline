import { getConnectionOptions, Connection, createConnection, getConnection } from "typeorm";
import xmldom from "xmldom";
import pgtools from "pgtools";

import { Channel, Episode, AgendaItem } from "../../logic/entities/Channel";
import Timepoint from "../../logic/entities/Timepoint";
import AsyncLoader from "./AsyncLoader";
import { RandomString } from "../../logic/RandomHelpers";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import CommentGenerator from "./CommentGenerator";
import User from "../../logic/entities/User";
import Comment from "../../logic/entities/Comments";
import VoteCommentRecord from "../../logic/entities/VoteCommentRecord";
import UserSettings from "../../logic/entities/UserSettings";
import PlaybackProgressRecord from "../../logic/entities/PlaybackProgressRecord";

// Channel Info handling
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

async function parseChannelFromRSS(rssContent: string): Promise<Channel | null> {
    const channel = new Channel();
    const xmlParser = new xmldom.DOMParser();
    const xmlDoc = xmlParser.parseFromString(rssContent, "text/xml");
    const docHelper = new ElementParserHelper(xmlDoc.documentElement);
    if (docHelper.hasChildOf("parsererror")) {
        console.error("Parsing RSS Failed. Reason: ", docHelper.firstChild("parseError").firstChild("div").getText());
        return null;
    }
    const channelNode = docHelper.firstChild("channel");
    if (!channelNode) {
        console.error("Can't parse RSS - doesn't have channel node");
        return null;
    }
    // The code below loads various nodes & attributes from the rss xml
    // into the channel data structure.

    // The "// usually" comments denote places where elements are under a namespace
    // CSS selectors don't support namespaces so they just fetch any element of the same tag, regardless of NS
    // so they work fine even though it looks wrong

    channel.title = channelNode.firstChild("title").getText();
    channel.description = channelNode.firstChild("description").getText();
    channel.author = channelNode.firstChild("author").getText(); // usually itunes:author
    channel.link = channelNode.firstChild("link").getText();
    // TODO: the image tag differs in rss feeds - sometimes there's a href attribute, and sometimes there are nested <url> tags
    channel.imageURL = ""; // channelNode.firstChild("image").getAttr("href");

    const allEpisodes: Episode[] = [];
    const episodeNodes = channelNode.allChildren("item");
    for (const episodeItem of episodeNodes) {
        const episode = new Episode();

        episode.owningChannelId = channel.id;
        episode.title = episodeItem.firstChild("title").getText();
        episode.description = episodeItem.firstChild("description").getText();
        episode.publicationDate = new Date(episodeItem.firstChild("pubDate").getText());
        // TODO: some episodes don't have a duration element
        if (episodeItem.firstChild("duration").element === undefined) {
            continue;
        }
        const durationText: string = episodeItem.firstChild("duration").getText(); // usually itunes:duration
        let asTimepoint: Timepoint|null = Timepoint.tryParseFromFormattedText(durationText);
        if (!asTimepoint) {
            // if there aren't timepoints with ":" delimiters then it's just total seconds
            asTimepoint = new Timepoint(~~durationText);
        }
        episode.durationInSeconds = asTimepoint.seconds;
        episode.audioURL = episodeItem.firstChild("enclosure").getAttr("url");
        episode.imageURL =episodeItem.firstChild("image").getAttr("href");

        // channels don't yet gave actual agenda so generate a random one
        // new item every X +- Y seconds
        const AGENDA_ITEM_INTERVAL = 600; // 10mins
        const AGENDA_ITEM_DEVIATION = 180; // with a deviation of 3mins
        const nextItemTime = (currentTime: number) => currentTime + AGENDA_ITEM_INTERVAL + (Math.random() - 0.5) * AGENDA_ITEM_DEVIATION;
        for (let i = 0; i < episode.durationInSeconds; i = nextItemTime(i)) {
            const item = new AgendaItem(RandomString.ofLength(30), new Timepoint(i));
            episode.agenda.items.push(item);
        }
        allEpisodes.push(episode);
    }

    await getConnection().createQueryBuilder()
        .insert()
        .into(Episode)
        .values(allEpisodes)
        .execute();

    return channel;
}

async function downloadAllRss(): Promise<Channel[]> {
    const onFetchFailed = async (): Promise<Channel> => {
        return Promise.reject(new Error("Download failed!"));
    };
    const parseWithPromise = async (rssContent: string): Promise<Channel> => {
        const parsedChannel: Channel | null = await parseChannelFromRSS(rssContent);
        if (parsedChannel) {
            return parsedChannel;
        } else {
            return Promise.reject(new Error("Parsing failed!"));
        }
    };

    const PODCAST_TO_RSS: Record<string, string> = {
        // "the-portal": "https://rss.art19.com/the-portal"
        // "making-sense": "https://wakingup.libsyn.com/rss"
        "the-portal": "https://www.omnycontent.com/d/playlist/9b7dacdf-a925-4f95-84dc-ac46003451ff/1713c520-edb6-43a3-b1b9-acb8002fdae7/58e33a0c-f86b-41c5-a11c-acb8002fdaf5/podcast.rss"
    };
    // Fire all requests at once, wait and process sequentially after that
    const promises: Promise<Channel>[] = [];
    for (const channel in PODCAST_TO_RSS) {
        const rssPromise = AsyncLoader.fetchTextFile(PODCAST_TO_RSS[channel]).then(parseWithPromise, onFetchFailed);
        promises.push(rssPromise);
    }
    return Promise.all(promises);
};

// Common DB Operations
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

    static async updateChannelInfo(): Promise<void> {
        console.log("Fetching latest data");
        const allChannels: Promise<Channel[]> = downloadAllRss();

        const connection: Connection = getConnection();
        console.log("Deleting existing data");
        // Can't execute the deletions in parallel - deleting a channel without deleting its episodes firsts
        // will cause the FKs to become null and which will fail validation
        await connection.createQueryBuilder()
            .delete()
            .from(Episode)
            .execute();
        await connection.createQueryBuilder()
            .delete()
            .from(Channel)
            .execute();

        const parsedChannels: Channel[] = await allChannels;

        console.log("Inserting new data");
        // Can't execute the insertions in parallel - channels need to be inserted first so that their PKs are generated.
        // Otherwise inserting the episodes will insert null FKs for channelOwner
        await connection.createQueryBuilder()
            .insert()
            .into(Channel)
            .values(parsedChannels)
            .execute();
        console.log("Update complete");
    }

    static async cleanUpUsers(): Promise<void> {
        console.log("Deleting existing data");
        const connection: Connection = getConnection();
        await connection.createQueryBuilder()
            .delete()
            .from(User)
            .execute();
        await connection.createQueryBuilder()
            .delete()
            .from(VoteCommentRecord)
            .execute();
        await connection.createQueryBuilder()
            .delete()
            .from(PlaybackProgressRecord)
            .execute();
        // await connection.createQueryBuilder()
        //     .delete()
        //     .from(UserActivity)
        //     .execute();
    }

    static async cleanUpComments(): Promise<void> {
        const connection: Connection = getConnection();
        console.log("Deleting existing data");
        // Working with tree data is tricky in TypeORM and for some things we can't use the SQL Builder
        // This is why this code mixes SQL Builder with the repository methods

        // Can't delete the records in the table through the treeRepository (see issue #193 in typeorm)
        // so run some SQL
        try {
            // It's possible comment_closure doesn't exist yet, ignore the exception
            await connection.createQueryBuilder()
                .from("comment_closure", "comment_closure")
                .delete()
                .execute();
        } catch (err) {}
        await connection.createQueryBuilder()
            .from(Comment, "comment")
            .delete()
            .execute();
    }

    static async randomizeUsers(): Promise<User[]> {
        console.log("Inserting new data");
        const names = ["Nikola", "Viktor", "Dimitroff", "Kirilov", "onqtam", "channelfan99"];
        const specialUsers: User[] = [User.createGuestUser(), User.createDeletedUser()];
        const users: User[] = specialUsers.slice();
        for (const name of names) {
            const user = new User();
            user.shortName = name;
            user.email = `${name}@gmail.com`;
            // user.activity = new UserActivity();
            // user.activity.internalDBDummyValue = ~~(Math.random() * Number.MAX_SAFE_INTEGER);
            user.settings = new UserSettings();
            users.push(user);
        }
        // const activities = users.map(u => u.activity);

        const connection: Connection = getConnection();
        // await connection.createQueryBuilder()
        //     .insert()
        //     .into(UserActivity)
        //     .values(activities)
        //     .execute();
        await connection.createQueryBuilder()
            .insert()
            .into(User)
            .values(users)
            .execute();
        // Before returning, remove index 0 as this is where the special users was inserted
        // and we don't want the special users to be known as an actual user in other parts of the code
        users.splice(0, specialUsers.length);
        return users;
    }

    static async randomizeComments(users: User[]): Promise<void> {
        console.log("Randomizing comment data");

        const connection: Connection = getConnection();
        // Only generate comments for the first episode as otherwise the operation takes too long
        const getFirstEpisode: Promise<Episode|undefined> = connection.createQueryBuilder(Episode, "episode").getOne();

        const episode: Episode = (await getFirstEpisode)!;
        const generator: CommentGenerator = new CommentGenerator(users, episode);
        const topLevelThreads: Comment[] = generator.generateRandomComments();

        const allComments: Comment[] = [];
        let currentLevelComments: Comment[] = topLevelThreads;
        while (currentLevelComments.length !== 0) {
            await connection.getTreeRepository(Comment).save(currentLevelComments);
            currentLevelComments = currentLevelComments.flatMap(c => c.replies || []);
            allComments.splice(allComments.length - 1, 0, ...currentLevelComments);
        }
        // generator.generateRandomVotes(allComments); // TODO: viktor: fixme!

        // User activities should now be filled, save them
        // const allActivities: UserActivity[] = users.map(u => u.activity);
        // const allVoteRecords: VoteCommentRecord[] = allActivities.flatMap(a => a.voteRecords || []);
        // The order is important - insert all vote records, then update activities
        // await connection.createQueryBuilder()
        //     .insert()
        //     .into(VoteCommentRecord)
        //     .values(allVoteRecords)
        //     .execute();
        // await connection.getRepository(UserActivity).save(allActivities);
        // Resave comments to update their up/down vote counters
        await connection.getRepository(Comment).save(allComments);

        console.log("Update complete");
    }
}
