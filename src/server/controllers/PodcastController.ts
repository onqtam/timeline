import { Request, Response } from "express";
import { getConnection } from "typeorm";
import { Podcast, Episode } from "../../logic/entities/Podcast";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";

export default class PodcastController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/podcasts",
            verb: HTTPVerb.Get,
            callback: PodcastController.getAllPodcasts
        }, {
            path: "/episodes/:podcastId",
            verb: HTTPVerb.Get,
            callback: PodcastController.getEpisodesFor
        }];
    }

    private static async getAllPodcasts(request: Request, response: Response): Promise<void> {
        const podcasts: Podcast[] = await getConnection()
            .createQueryBuilder(Podcast, "podcast")
            .leftJoinAndSelect("podcast.episodes", "episode")
            .getMany();
        response.end(EncodingUtils.jsonify(podcasts));
    }

    private static async getEpisodesFor(request: Request, response: Response): Promise<void> {
        type PodcastParams = { podcastId: number };
        const podcastId: number = (request.params as unknown as PodcastParams).podcastId;
        const episodes: Episode[] = await getConnection()
            .createQueryBuilder()
            .relation(Podcast, "episodes")
            .of(podcastId)
            .loadMany();
        response.end(EncodingUtils.jsonify(episodes));
    }
}
