import { Request, Response } from "express";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

import Comment from "../../logic/entities/Comments";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";
import { getConnection } from "typeorm";
import Timepoint from "../../logic/entities/Timepoint";
import User from "../../logic/entities/User";
import VoteCommentRecord from "../../logic/entities/VoteCommentRecord";
import { Episode } from "../../logic/entities/Episode";
import { QBE, QB } from "../utils/dbutils";

export default class CommentController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/comments/:episodeId/:intervalStart-:intervalEnd",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: CommentController.getCommentThreadsFor
        }, {
            path: "/comments/histogram/:episodeId/",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: CommentController.getCommentDensityChartData
        }, {
            path: "/comments/user/:userId",
            verb: HTTPVerb.Get,
            requiresAuthentication: false,
            callback: CommentController.getUserComments
        }, {
            path: "/comments/",
            verb: HTTPVerb.Post,
            requiresAuthentication: true,
            callback: CommentController.postComment
        }, {
            path: "/comments/",
            verb: HTTPVerb.Put,
            requiresAuthentication: true,
            callback: CommentController.editComment
        }, {
            path: "/comments/",
            verb: HTTPVerb.Delete,
            requiresAuthentication: true,
            callback: CommentController.deleteComment
        }, {
            path: "/comments/votes/:episodeId/",
            verb: HTTPVerb.Get,
            requiresAuthentication: true,
            callback: CommentController.getVotes
        }, {
            path: "/comments/vote/",
            verb: HTTPVerb.Post,
            requiresAuthentication: true,
            callback: CommentController.recordVote
        }];
    }

    private static async getCommentThreadsFor(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId,
            intervalStart: ~~request.params.intervalStart,
            intervalEnd: ~~request.params.intervalEnd
        };
        console.log("\n== getCommentThreadsFor - Received params: ", JSON.stringify(params));

        const rootsWithinInterval: Comment[] = await getConnection()
            .createQueryBuilder(Comment, "comment")
            .where(`comment."parentCommentId" is NULL`) // Roots
            .andWhere(`comment."episodeId" = :episodeId`, params) // For this episode
            .andWhere(`comment."startSeconds" >= :intervalStart`, params) // In the given interval
            .andWhere(`comment."startSeconds" <= :intervalEnd`, params)
            // .leftJoinAndSelect("comment.author", "author")
            // .leftJoinAndSelect("comment.episode", "episode")
            .getMany();

        const getTreeOfRoot = async (c: Comment): Promise<Comment> => {
            const commentRepository = getConnection().getTreeRepository(Comment);
            return commentRepository.findDescendantsTree(c);
        };
        const query_completeTrees: Promise<Comment[]> = Promise.all(rootsWithinInterval.map(getTreeOfRoot));
        response.end(EncodingUtils.jsonify(await query_completeTrees));
    }

    private static async getUserComments(request: Request, response: Response): Promise<void> {
        const params = {
            userId: ~~request.params.userId
        };
        console.log("\n== getUserComments - Received params: ", JSON.stringify(params));

        const query_allCommentsByUser: Promise<Comment[]> = QBE(Comment, "comment")
            .select()
            .where(`comment."userId" = :userId`, params)
            .orderBy(`"date_modified"`, "DESC")
            .getMany();

        response.end(EncodingUtils.jsonify(await query_allCommentsByUser));
    }

    private static async getCommentDensityChartData(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId
        };
        const episode: Episode|undefined = (await QB()
            .select()
            .from(Episode, "episode")
            .where(`episode."id" = :episodeId`, params)
            .execute())[0];

        if (!episode) {
            // TODO: why not simply throw some string and let the catch-all handler just return a 500 status code? ......
            response.status(404).send("episode not found").end();
            return;
        }

        // we want exactly 100 buckets so the bucket length is 1% of the episode duration
        const NUM_BUCKETS = 100;
        const BUCKET_SIZE = episode.durationInSeconds / NUM_BUCKETS;

        type CommentDensityRecord = {
            bucketIndex: number;
            commentCount: number;
        };
        const commentBucketHistogram: CommentDensityRecord[] = await QBE(Comment, "comment")
            .select(`cast(comment."startSeconds" / ${BUCKET_SIZE} as int)`, "bucketIndex")
            .addSelect("count(*)", "commentCount")
            .where(`comment."episodeId" = :episodeId`, params)
            .groupBy(`"bucketIndex"`)
            .orderBy(`"bucketIndex"`)
            .execute();
        const xAxis: number[] = commentBucketHistogram.map(record => record.bucketIndex);
        const yAxis: number[] = commentBucketHistogram.map(record => ~~record.commentCount); // node-pg returns COUNT as a string so convert to number

        // Fill in values for missing buckets
        for (let i = 0; i < xAxis.length; i++) {
            while (xAxis[i] !== i) {
                xAxis.splice(i, 0, i);
                yAxis.splice(i, 0, 0);
                i++;
            }
        }
        // Fill in values for the remaining empty buckets
        for (let i = xAxis.length; i < NUM_BUCKETS; i++) {
            yAxis.splice(i, 0, 0);
        }

        response.end(EncodingUtils.jsonify(yAxis));
    }

    private static async getVotes(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId
        };
        console.log("\n== getVotes - Received params: ", JSON.stringify(params));

        const user: User = request.user! as User;
        console.assert(user);

        const query_allVotesForEpisode: Promise<VoteCommentRecord[]> = QBE(VoteCommentRecord, "voteRecord")
            .select()
            .where(`"voteRecord"."userId" = :uid`, { uid: user.id })
            .andWhere(`"voteRecord"."episodeId" = :eid`, { eid: params.episodeId })
            .getMany();

        response.end(EncodingUtils.jsonify(await query_allVotesForEpisode));
    }

    private static async recordVote(request: Request, response: Response): Promise<void> {
        const params = {
            commentId: ~~request.body.commentId,
            episodeId: ~~request.body.episodeId,
            wasVotePositive: request.body.wasVotePositive
        };
        console.log("\n== recordVote - Received params: ", JSON.stringify(params));

        const user: User = request.user! as User;
        console.assert(user);

        const existingRecord: VoteCommentRecord | undefined = await QBE(VoteCommentRecord, "voteRecord")
            .select()
            .where(`"voteRecord"."userId" = :uid`, { uid: user.id })
            .andWhere(`"voteRecord"."commentId" = :cid`, { cid: params.commentId })
            .getOne();

        let query_upsertRecord: Promise<void>;
        // this is with how much we should update the comment up/down counters later
        let upVotes = 0;
        let downVotes = 0;

        if (!existingRecord) {
            // new vote - no previous votes from this user for this comment
            query_upsertRecord = QBE(VoteCommentRecord, "voteRecord")
                .insert()
                .values([new VoteCommentRecord(params.commentId, user.id, params.episodeId, params.wasVotePositive)])
                .execute() as unknown as Promise<void>;
            // handle the comment counters as well
            if (params.wasVotePositive) {
                upVotes++;
            } else {
                downVotes++;
            }
        } else {
            if (existingRecord.wasVotePositive !== params.wasVotePositive) {
                // changing vote for record
                query_upsertRecord = QB()
                    .update(VoteCommentRecord)
                    .where(`"userId" = :uid`, { uid: user.id })
                    .andWhere(`"commentId" = :cid`, { cid: params.commentId })
                    .set({
                        wasVotePositive: params.wasVotePositive,
                        date: new Date()
                    })
                    .execute() as unknown as Promise<void>;
                // handle the comment counters as well
                if (params.wasVotePositive) {
                    upVotes++;
                    downVotes--;
                } else {
                    upVotes--;
                    downVotes++;
                }
            } else {
                // reverting vote for record
                query_upsertRecord = QB()
                    .delete()
                    .from(VoteCommentRecord)
                    .where(`"userId" = :uid`, { uid: user.id })
                    .andWhere(`"commentId" = :cid`, { cid: params.commentId })
                    .execute() as unknown as Promise<void>;
                // handle the comment counters as well
                if (params.wasVotePositive) {
                    upVotes--;
                } else {
                    downVotes--;
                }
            }
        }

        const query_updateCommentCounters = QB()
            .update(Comment)
            .where(`"id" = :cid`, { cid: params.commentId })
            .set({
                upVotes: () => `"upVotes" + ` + upVotes,
                downVotes: () => `"downVotes" + ` + downVotes
            })
            .execute();

        // TODO: update user karma - not who is voting but whoever owns the comment

        await Promise.all([query_upsertRecord, query_updateCommentCounters]);
        response.end();
    }

    private static async postComment(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: request.body.episodeId as number,
            commentToReplyToId: request.body.commentToReplyToId as number | null,
            startSeconds: ~~request.body.startSeconds as number,
            content: request.body.content as string
        };
        console.log("\n== postComment - Received params: ", JSON.stringify(params));

        console.assert(params.content.length);

        // TODO: why do we need this? just to validate that the episodeId from the request matches reality? But then we would have to also check that the parent comment (if this is a reply) is also from the same episode...
        const query_episode: Promise<Episode | undefined> = QBE(Episode, "episode")
            .whereInIds([params.episodeId])
            .getOne();

        const user: User = request.user! as User;
        console.assert(user);

        const newComment = new Comment();
        newComment.content = params.content;
        newComment.date_added = new Date();
        newComment.date_modified = new Date();
        newComment.downVotes = 0;
        newComment.upVotes = 0;
        newComment.start = new Timepoint(params.startSeconds);
        newComment.userId = user.id;
        newComment.userName = user.shortName;
        newComment.episodeId = (await query_episode)!.id;
        newComment.replies = [];

        // This operation is impossible to write with SQL Builder
        // unless we basically copy/paste the code from TypeORM here which would make it hardly readable
        // Prefer repository.save instead
        const commentRepo = getConnection().getTreeRepository(Comment);
        if (params.commentToReplyToId) {
            const query_parentComment: Promise<Comment | undefined> = commentRepo.findOne(params.commentToReplyToId);
            const parentComment = await commentRepo.findDescendantsTree((await query_parentComment)!);
            console.assert(parentComment.start.seconds === newComment.start.seconds);
            if (parentComment.replies === undefined) {
                parentComment.replies = [];
            }
            newComment.parentComment = parentComment;
            parentComment.replies.push(newComment);

            await commentRepo.save(newComment);
            await commentRepo.save(parentComment);
        } else {
            await commentRepo.save(newComment);
        }

        const returnValue = { commentId: newComment.id };
        response.end(EncodingUtils.jsonify(returnValue));
    }

    private static async editComment(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: request.body.episodeId as number,
            commentId: request.body.commentId as number,
            content: request.body.content as string
        };
        console.log("\n== editComment - Received params: ", JSON.stringify(params));

        console.assert(params.content.length);

        const user: User = request.user! as User;
        console.assert(user);

        // TODO: Check and report errors
        await QB()
            .update(Comment)
            .where(`"id" = :commentId`, params)
            .andWhere(`"episodeId" = :episodeId`, params)
            .andWhere(`"userId" = :id`, user)
            .set({
                content: params.content,
                date_modified: new Date()
            })
            .execute();

        response.end();
    }

    private static async deleteComment(request: Request, response: Response): Promise<void> {
        const params = {
            commentId: request.body.commentId as number
        };
        console.log("\n== deleteComment - Received params: ", JSON.stringify(params));

        const user: User = request.user! as User;
        console.assert(user);

        // Replace the comment's content and user
        const deletedCommentValues: QueryDeepPartialEntity<Comment> = {
            userId: User.deletedUserId,
            userName: User.deletedUserName,
            content: Comment.deletedCommentContents,
            date_modified: new Date()
        };

        // TODO: Check and report errors
        await QB()
            .update(Comment)
            .where(`"id" = :commentId`, params)
            .andWhere(`"userId" = :id`, user)
            .set(deletedCommentValues)
            .execute();

        // TODO: remove the vote comment records for this comment?
        // TODO: look how reddit handles this... and if votes on deleted comments show up in user's profiles
        // = QB()
        //     .delete()
        //     .from(VoteCommentRecord)
        //     .where(`"userId" = :uid`, { uid: user.id })
        //     .andWhere(`"commentId" = :cid`, { cid: params.commentId })
        //     .execute() as unknown as Promise<void>;

        response.end();
    }
}
