import { Request, Response } from "express";

import Comment from "../../logic/entities/Comments";
import { RandomIntegerDistribution } from "../../logic/RandomHelpers";
import MathHelpers from "../../logic/MathHelpers";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from '../../logic/HTTPVerb';

export default class CommentController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/comments",
            verb: HTTPVerb.Get,
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
        const comments: Comment[] = [];
        response.end(EncodingUtils.jsonify(comments));
    }
}
