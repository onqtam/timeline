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
            requiresAuthentication: false,
            callback: PodcastController.getAllPodcasts
        }, {
            path: "/episodes/:podcastId",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: PodcastController.getEpisodesFor
        }, {
            path: "/episodes/:podcastURL/:episodeURL",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: PodcastController.getEpisodeFromURL
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


    private static async getEpisodeFromURL(request: Request, response: Response): Promise<void> {
        const params = {
            podcastTitle: EncodingUtils.urlAsTitle(request.params["podcastURL"]),
            episodeTitle: EncodingUtils.urlAsTitle(request.params["episodeURL"])
        };
        const podcast: Podcast|undefined = (await getConnection()
            .createQueryBuilder()
            .select()
            .from(Podcast, "podcast")
            .where(`podcast."title" = :podcastTitle`, params)
            .execute())[0];
        if (!podcast) {
            response.status(404).end();
        }

        const episode: Episode|undefined = (await getConnection()
            .createQueryBuilder()
            .select()
            .from(Episode, "episode")
            .where(`episode."title" = :episodeTitle`, params)
            .andWhere(`episode."owningPodcastId" = :podcastId`, { podcastId: podcast?.id })
            .execute())[0];

        if (!episode) {
            response.status(404).end();
            return;
        }
        response.end(EncodingUtils.jsonify(episode));
    }
}
