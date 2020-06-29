import { Podcast, Episode } from "@/logic/Podcast";
import Timepoint from "@/logic/Timepoint";
import AsyncLoader from "@/logic/AsyncLoader";

const guaranteeLoadText = function (element: Element, childSelector: string): string {
    const value = element.querySelector(childSelector)?.textContent;
    console.assert(value !== undefined && value !== null);
    return value!;
};
const guaranteeLoadAttr = function (element: Element, childSelector: string, attributeName: string): string {
    const attr = element.querySelector(childSelector)?.attributes.getNamedItem(attributeName);
    console.assert(attr !== undefined && attr !== null);
    return attr!.textContent!;
};

const parsePodcastFromRSS = function (rssContent: string): Podcast | null {
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

    podcast.title = guaranteeLoadText(channel, "title");
    podcast.description = guaranteeLoadText(channel, "description");
    podcast.author = guaranteeLoadText(channel, "author"); // usually itunes:author
    podcast.link = guaranteeLoadText(channel, "link");
    podcast.imageURL = guaranteeLoadText(channel, "image url");

    const episodeNodes = channel.querySelectorAll("item");
    for (const episodeItem of episodeNodes) {
        const episode = new Episode();

        episode.title = guaranteeLoadText(episodeItem, "title");
        episode.description = guaranteeLoadText(episodeItem, "description");
        episode.publicationDate = new Date(guaranteeLoadText(episodeItem, "pubDate"));
        const durationText: string = guaranteeLoadText(episodeItem, "duration"); // usually itunes:author
        const asTimepoint: Timepoint|null = Timepoint.tryParseFromFormattedText(durationText);
        if (!asTimepoint) {
            console.error("Failed to parse duration of episode with title: ", episode.title);
            continue;
        }
        episode.durationInSeconds = asTimepoint.seconds;
        episode.audioURL = guaranteeLoadAttr(episodeItem, "enclosure", "url");
        episode.imageURL = guaranteeLoadAttr(episodeItem, "image", "href");

        podcast.episodes.push(episode);
    }
    return podcast;
};

export interface IStorePodcastModule {
    allPodcasts: Record<string, Podcast>;
    findEpisode(podcastTitleURL: string, episodeTitleURL: string): Episode|undefined;
}

export class StorePodcastViewModel implements IStorePodcastModule {
    public allPodcasts: Record<string, Podcast>;
    private podcastToRSS: Record<string, string> = {
        "the-portal": "https://rss.art19.com/the-portal"
    };

    constructor() {
        this.allPodcasts = {};
        const onFetchFailed = (podcastTitle: string) => {
            console.error("Failed to download podcast RSS!", podcastTitle);
        };
        const onFetchSuccessful = (podcastTitle: string, rssContent: string) => {
            const parsedPodcast: Podcast | null = parsePodcastFromRSS(rssContent);
            if (parsedPodcast) {
                this.allPodcasts[podcastTitle] = parsedPodcast;
            } else {
                console.error("Failed to parse podcast RSS!", podcastTitle);
            }
        };
        // Fire all requests at once, wait and process sequentially after that
        type NameRSSPair = { title: string; rss: Promise<string> };
        const loaderPromises: NameRSSPair[] = [];
        for (const podcast in this.podcastToRSS) {
            const rssPromise = AsyncLoader.fetchTextFile(this.podcastToRSS[podcast]);
            loaderPromises.push({ title: podcast, rss: rssPromise });
        }
        for (const rssPair of loaderPromises) {
            rssPair.rss
                .then(rssContent => onFetchSuccessful(rssPair.title, rssContent))
                .catch(onFetchFailed);
        }
    }

    public findEpisode(podcastTitleURL: string, episodeTitleURL: string): Episode|undefined {
        const podcast: Podcast|undefined = Object.values(this.allPodcasts).find(p => p.titleAsURL === podcastTitleURL);
        return podcast?.episodes.find(e => e.titleAsURL === episodeTitleURL);
    }
}

const podcastModule = new StorePodcastViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: podcastModule
};
