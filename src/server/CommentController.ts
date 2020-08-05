import express, { Application } from "express";

import CommentThread from "../logic/Comments";
import { RandomIntegerDistribution } from "../logic/RandomHelpers";
import MathHelpers from "../logic/MathHelpers";

class CommentDataRequest {
    public episodeId!: number;
    public intervalStart!: number;
    public intervalDuration!: number;
}

export default class CommentController {
    public static registerRoutes(app: express.Application): void {
        type CommentRequest = express.Request<{}, CommentThread[], CommentDataRequest>;
        type CommentResponse = express.Response<CommentThread[]>;
        app.get("/comments", (req: CommentRequest, res: CommentResponse): void => {
            res.setHeader("Content-Type", "application/json");
            // TODO: Validate input
            const commentThreads: CommentThread[] = this.getCommentThreadsFor(req.body);
            const responseData = JSON.stringify(commentThreads, null, 2);
            res.end(responseData);
        });
    }

    private static getCommentThreadsFor(info: CommentDataRequest): CommentThread[] {
        return CommentController.regenerateRandomComments(info.intervalStart, info.intervalDuration);
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
