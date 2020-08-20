import { Request, Response } from "express";

import Comment from "../../logic/entities/Comments";
import { RandomIntegerDistribution } from "../../logic/RandomHelpers";
import MathHelpers from "../../logic/MathHelpers";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from '../../logic/HTTPVerb';
import { getConnection, LessThanOrEqual, MoreThanOrEqual, FindManyOptions, Raw, getConnectionOptions } from 'typeorm';

export default class CommentController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/comments",
            verb: HTTPVerb.Put,
            callback: CommentController.getCommentThreadsFor
        }];
    }

    private static async getCommentThreadsFor(request: Request, response: Response): Promise<void> {
        type CommentDataRequest = {
            episodeId: number;
            intervalStart: number;
            intervalDuration: number;
        };
        const params = request.body as CommentDataRequest;
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
        response.end(EncodingUtils.jsonify(completeTrees));
    }
}
