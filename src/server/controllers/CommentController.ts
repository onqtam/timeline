import { Request, Response } from "express";

import Comment from "../../logic/entities/Comments";
import { RandomIntegerDistribution } from "../../logic/RandomHelpers";
import MathHelpers from "../../logic/MathHelpers";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from '../../logic/HTTPVerb';
import { getConnection, LessThanOrEqual, MoreThanOrEqual, FindManyOptions, Raw, getConnectionOptions } from 'typeorm';
import Timepoint from "../../logic/entities/Timepoint";

export default class CommentController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/comments/:episodeId/:intervalStart-:intervalEnd",
            verb: HTTPVerb.Get,
            callback: CommentController.getCommentThreadsFor
        }];
    }

    private static async getCommentThreadsFor(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId,
            intervalStart: ~~request.params.intervalStart,
            intervalEnd: ~~request.params.intervalEnd
        };
        console.log("Received params: ", JSON.stringify(params));

        const rootsWithinInterval: Comment[] = await getConnection().createQueryBuilder()
            .select()
            .from(Comment, "comment")
            .where("comment.\"parentId\" is NULL") // Roots
            .where("comment.\"episodeId\" = :episodeId", params) // For this episode
            .andWhere("comment.\"timepointSeconds\" >= :intervalStart", params) // In the given interval
            .andWhere("comment.\"timepointSeconds\" <= :intervalEnd", params)
            .execute();

        const getTreeOfRoot = async (c: Comment): Promise<Comment> => {
            return getConnection().getTreeRepository(Comment)
                .findDescendantsTree(c);
        }
        const query_completeTrees: Promise<Comment[]> = Promise.all(rootsWithinInterval.map(getTreeOfRoot));
        const completeTrees: Comment[] = await query_completeTrees;
        // Fix any discrepancies between the DB data and the expected data
        for (let comment of completeTrees) {
            comment.timepoint = new Timepoint((comment as any).timepointSeconds);
        }
        response.end(EncodingUtils.jsonify(completeTrees));
    }
}
