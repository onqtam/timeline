import { Request, Response } from "express";
import { getConnection } from "typeorm";
import { Channel, Episode } from "../../logic/entities/Channel";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";

export default class ChannelController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/channels",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: ChannelController.getAllChannels
        }, {
            path: "/episodes/:channelId",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: ChannelController.getEpisodesFor
        }, {
            path: "/episodes/:channelURL/:episodeURL",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: ChannelController.getEpisodeFromURL
        }];
    }

    private static async getAllChannels(request: Request, response: Response): Promise<void> {
        const channels: Channel[] = await getConnection()
            .createQueryBuilder(Channel, "channel")
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

    private static async getEpisodeFromURL(request: Request, response: Response): Promise<void> {
        const params = {
            channelTitle: EncodingUtils.urlAsTitle(request.params.channelURL),
            episodeTitle: EncodingUtils.urlAsTitle(request.params.episodeURL)
        };
        const channel: Channel|undefined = (await getConnection()
            .createQueryBuilder()
            .select()
            .from(Channel, "channel")
            .where(`channel."title" = :channelTitle`, params)
            .execute())[0];
        if (!channel) {
            response.status(404).end();
        }

        const episode: Episode|undefined = (await getConnection()
            .createQueryBuilder()
            .select()
            .from(Episode, "episode")
            .where(`episode."title" = :episodeTitle`, params)
            .andWhere(`episode."owningChannelId" = :channelId`, { channelId: channel?.id })
            .execute())[0];

        if (!episode) {
            response.status(404).end();
            return;
        }
        response.end(EncodingUtils.jsonify(episode));
    }
}
