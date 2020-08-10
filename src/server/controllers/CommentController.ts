import { Request, Response } from "express";

import CommentThread from "../../logic/Comments";
import { RandomIntegerDistribution } from "../../logic/RandomHelpers";
import MathHelpers from "../../logic/MathHelpers";
import RouteInfo, { HTTPVerb } from "../RouteInfo";
import EncodingUtils from "../EncodingUtils";

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
        const comments: CommentThread[] = CommentController.regenerateRandomComments(params.intervalStart, params.intervalDuration);
        response.end(EncodingUtils.jsonify(comments));
    }

    private static regenerateRandomComments(intervalStart: number, duration: number): CommentThread[] {
        const commentThreads: CommentThread[] = [];

        const commentsPerThread = new RandomIntegerDistribution([0, 1, 2, 3, 4, 5], [0.35, 0.2, 0.15, 0.05, 0.1, 0.15]);
        const threadsPerTimeslot = new RandomIntegerDistribution([0, 1, 2, 3, 4, 5], [0.4, 0.15, 0.1, 0.1, 0.1, 0.15]);
        const nestedness = 1;
        const chanceForNested = 0.15;
        const timeslotDuration = 12;
        for (let t = intervalStart; t < duration; t += timeslotDuration) {
            const threadsInSlot = threadsPerTimeslot.sample();
            for (let i = 0; i < threadsInSlot; i++) {
                let newThread: CommentThread;
                const commentsForCurrentThread = commentsPerThread.sample();
                if (Math.random() <= chanceForNested) {
                    newThread = CommentThread.generateRandomThreadWithChildren(commentsForCurrentThread, nestedness);
                } else {
                    newThread = CommentThread.generateRandomThread(commentsForCurrentThread);
                }
                newThread.timepoint.seconds = MathHelpers.randInRange(t, t + timeslotDuration);
                commentThreads.push(newThread);
            }
        }

        return commentThreads;
    }
}
