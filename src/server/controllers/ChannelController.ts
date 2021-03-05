import { Request, Response } from "express";
import { getConnection } from "typeorm";
import { Channel, Episode } from "../../logic/entities/Channel";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";
import { QBE, QB } from "../utils/dbutils";

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
            response.status(404).end();
            return;
        }
        response.end(EncodingUtils.jsonify(episode));
    }
}
