import { Request, Response } from "express";
import { getConnection, InsertResult } from "typeorm";
import { Channel, Episode } from "../../logic/entities/Channel";
import { Agenda } from "../../logic/entities/Episode";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";
import CommonParams from "../../logic/CommonParams";
import { QBE, QB } from "../utils/dbutils";
import axios, { AxiosResponse } from "axios";
import { YouTubeDurationToSeconds } from "../../logic/MiscHelpers";

const YOUTUBE_DATA_API_KEY="AIzaSyDi1AK9ELda6EtNFYqFhDxzZFZH2mmzlRw";

export default class ChannelController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/channels",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: ChannelController.getAllChannels
        }, {
        //     path: "/channels/:channelId",
        //     verb: HTTPVerb.Get,
        //     requiresAuthentication: false,
        //     callback: ChannelController.getChannelInfo
        // }, {
            path: "/channels/:channelId/episodes",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: ChannelController.getEpisodesFor
        }, {
            path: "/episodes/:episodeId",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: ChannelController.getEpisode
        }, {
            path: "/episodes/youtube/:youtubeId",
            verb: HTTPVerb.Get,
            requiresAuthentication: true,
            callback: ChannelController.getYouTubeEpisode
        }];
    }

    private static async getAllChannels(request: Request, response: Response): Promise<void> {
        const channels: Channel[] = await QBE(Channel, "channel")
            .leftJoinAndSelect("channel.episodes", "episode")
            .getMany();
        response.end(EncodingUtils.jsonify(channels));
    }

    private static async getEpisodesFor(request: Request, response: Response): Promise<void> {
        type ChannelParams = { channelId: number };
        const channelId: number = (request.params as unknown as ChannelParams).channelId;
        const episodes: Episode[] = await getConnection()
            .createQueryBuilder()
            .relation(Channel, "episodes")
            .of(channelId)
            .loadMany();
        response.end(EncodingUtils.jsonify(episodes));
    }

    private static async getEpisode(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId
        };
        console.log("\n== getEpisode - Received params: ", JSON.stringify(params));

        const episode: Episode|undefined = (await QB()
            .select()
            .from(Episode, "episode")
            .where(`episode."id" = :episodeId`, params)
            .execute())[0];

        if (!episode) {
            response.status(404).send("video ID not found").end();
            return;
        }

        // TODO: don't always generate it - figure out how to store it in the DB!
        episode.agenda = new Agenda();
        episode.agenda.items = Agenda.parseYouTubeTimestamps(episode.description);

        response.end(EncodingUtils.jsonify(episode));
    }

    static async getYouTubeChannelId(YTChannelId: string): Promise<number> {
        console.assert(YTChannelId.length === 24); // should be revisited

        const channelIdResult: number|undefined = (await QB()
            .select("id")
            .from(Channel, "channel")
            .where(`channel."external_id" = :youtubeId`, { youtubeId: YTChannelId })
            .andWhere(`channel."external_source" = :source`, { source: CommonParams.EXTERNAL_SOURCE_YOUTUBE })
            .execute())[0];

        if (channelIdResult) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (channelIdResult as any).id;
        }

        const restURL = "https://www.googleapis.com/youtube/v3/channels?part=snippet&id=" + YTChannelId + "&key=" + YOUTUBE_DATA_API_KEY;

        return axios.get(restURL).then(async (result: AxiosResponse) => {
            if (result.data.items.length !== 1) { throw new Error("something went wrong - did not receive exactly 1 item from YouTube"); }
            const snippet = result.data.items[0].snippet;

            const channel = new Channel();
            channel.external_id = YTChannelId;
            channel.external_source = CommonParams.EXTERNAL_SOURCE_YOUTUBE;
            channel.title = snippet.title;
            channel.description = snippet.description;
            channel.resource_url = "";
            channel.imageURL = snippet.thumbnails.high.url;

            return (await QB().insert()
                .into(Channel)
                .values(channel)
                .returning("id")
                .execute() as InsertResult).identifiers[0].id;
        });
    }

    static async getYouTubeEpisode(request: Request, response: Response): Promise<void> {
        await ChannelController.makeSureThereIsAtLeastOneNormalMP3(); // NASTY HACK! :D

        const params = {
            youtubeId: request.params.youtubeId
        };
        console.log("\n== getYouTubeEpisode - Received params: ", JSON.stringify(params));

        // youtube IDs have a length of 11: https://stackoverflow.com/a/6250619/3162383
        if (params.youtubeId.length !== 11) {
            response.status(400).send("invalid YouTube video ID").end();
            return;
        }

        // check if the youtube video ID is already present in our system
        let episode: Episode|undefined = (await QB()
            .select()
            .from(Episode, "episode")
            .where(`episode.external_id = :youtubeId`, params)
            .andWhere(`episode."external_source" = :source`, { source: CommonParams.EXTERNAL_SOURCE_YOUTUBE })
            .execute())[0];
        if (episode) {
            response.end(EncodingUtils.jsonify(episode));
            return;
        }

        // we don't have that episode in our system - time to fetch info from YouTube
        const restURL = "https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails&id=" + params.youtubeId + "&key=" + YOUTUBE_DATA_API_KEY;

        episode = await axios.get(restURL).then(async (result: AxiosResponse) => {
            if (result.data.items.length !== 1) { throw new Error("video does not exist!"); }

            const snippet = result.data.items[0].snippet;
            const duration = result.data.items[0].contentDetails.duration;

            if (!result.data.items[0].status.embeddable) {
                throw new Error("video not embeddable!");
            }
            // status.privacyStatus: "private"/"public"/"unlisted"
            // https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails&id=YJWPowbCK_I&key=AIzaSyDi1AK9ELda6EtNFYqFhDxzZFZH2mmzlRw
            if (result.data.items[0].status.privacyStatus === "private") {
                throw new Error("video is private!");
            }

            const episode = new Episode();
            episode.external_id = result.data.items[0].id;
            episode.external_source = CommonParams.EXTERNAL_SOURCE_YOUTUBE;
            episode.title = snippet.title;
            episode.description = snippet.description;
            episode.publicationDate = new Date(Date.parse(snippet.publishedAt));
            episode.durationInSeconds = YouTubeDurationToSeconds(duration);
            episode.resource_url = "";
            episode.imageURL = snippet.thumbnails.high.url;
            episode.owningChannelId = await ChannelController.getYouTubeChannelId(snippet.channelId);

            return (await QB().insert()
                .into(Episode)
                .values(episode)
                .returning("*")
                .execute() as InsertResult).raw[0] as Episode;
        }).catch((error: Error) => {
            // TODO: why not simply throw some string and let the catch-all handler just return a 500 status code? ......
            console.error(error);
            response.status(400).send(error.message).end();
            response.end();
            return undefined;
        });

        if (!episode) {
            return;
        }

        response.end(EncodingUtils.jsonify(episode as Episode));
    }

    static async makeSureThereIsAtLeastOneNormalMP3(): Promise<void> {
        const numMP3: number|undefined = await QB()
            .select()
            .from(Episode, "episode")
            .where(`episode."external_source" = :source`, { source: CommonParams.EXTERNAL_SOURCE_PODCAST_RSS })
            .getCount();
        if (!numMP3) {
            // taken from here: https://wakingup.libsyn.com/rss
            const episode = new Episode();
            episode.external_source = CommonParams.EXTERNAL_SOURCE_PODCAST_RSS;
            episode.title = "#240 — The Boundaries of Self";
            episode.description = "desc desc desc";
            episode.publicationDate = new Date(Date.now());
            episode.durationInSeconds = 2637;
            episode.resource_url = "https://traffic.libsyn.com/secure/wakingup/Making_Sense_240_David_Whyte2028Paywall29.mp3";
            episode.imageURL = "img img img";
            episode.owningChannelId = 1; // whatever...
            await QB().insert().into(Episode).values(episode).execute();
        }
    }
}
