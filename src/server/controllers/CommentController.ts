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
import { QB } from "../utils/dbutils";

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
            path: "/comments/",
            verb: HTTPVerb.Post,
            requiresAuthentication: true,
            callback: CommentController.postComment
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
        }, {
            path: "/comments/vote/",
            verb: HTTPVerb.Delete,
            requiresAuthentication: true,
            callback: CommentController.revertVote
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
            .andWhere(`comment."timepointSeconds" >= :intervalStart`, params) // In the given interval
            .andWhere(`comment."timepointSeconds" <= :intervalEnd`, params)
            // .leftJoinAndSelect("comment.author", "author")
            // .leftJoinAndSelect("comment.episode", "episode")
            .getMany();

        const getTreeOfRoot = async (c: Comment): Promise<Comment> => {
            const commentRepository = getConnection().getTreeRepository(Comment);
            return commentRepository.findDescendantsTree(c);
        };
        const query_completeTrees: Promise<Comment[]> = Promise.all(rootsWithinInterval.map(getTreeOfRoot));
        const completeTrees: Comment[] = await query_completeTrees;
        console.log("== LOGGING LOTS OF STUFF:");
        console.log(completeTrees);
        response.end(EncodingUtils.jsonify(completeTrees));
    }

    private static async getCommentDensityChartData(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId
        };
        const FIXED_TIMESLOT_SIZE: number = 60; // Group every X seconds together

        type CommentDensityRecord = {
            timeslotIndex: number;
            commentCount: number;
        };
        const commentTimeslotHistogram: CommentDensityRecord[] = await getConnection()
            .createQueryBuilder(Comment, "comment")
            .select(`comment."timepointSeconds" / ${FIXED_TIMESLOT_SIZE}`, "timeslotIndex")
            .addSelect("count(*)", "commentCount")
            .where(`comment."episodeId" = :episodeId`, params) // For this episode
            .groupBy(`"timeslotIndex"`)
            .orderBy(`"timeslotIndex"`)
            .execute();
        const xAxis: number[] = commentTimeslotHistogram.map(record => record.timeslotIndex);
        const yAxis: number[] = commentTimeslotHistogram.map(record => ~~record.commentCount); // node-pg returns COUNT as a string so convert to number
        // Fill in values for missing timeslots
        for (let i = 0; i < xAxis.length; i++) {
            while (xAxis[i] !== i) {
                xAxis.splice(i, 0, i);
                yAxis.splice(i, 0, 0);
                i++;
            }
        }
        const resultData = {
            xAxis: xAxis,
            yAxis: yAxis,
            xAxisDistance: FIXED_TIMESLOT_SIZE
        };
        response.end(EncodingUtils.jsonify(resultData));
    }

    private static async getVotes(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId
        };
        console.log("\n== getVotes - Received params: ", JSON.stringify(params));

        const user: User = request.user! as User;
        console.assert(user);

        const query_allVotesForEpisode: Promise<VoteCommentRecord[]> = QB(VoteCommentRecord, "voteRecord")
            .select()
            .where(`"voteRecord"."userId" = :uid`, { uid: user.id })
            .andWhere(`"voteRecord"."episodeId" = :eid`, { eid: params.episodeId })
            .getMany();

        const res: VoteCommentRecord[] = await query_allVotesForEpisode;
        console.log(res);

        response.end(EncodingUtils.jsonify(res));
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

        const query_existingRecord: Promise<VoteCommentRecord | undefined> = getConnection()
            .createQueryBuilder(VoteCommentRecord, "voteRecord")
            .select()
            .where(`"voteRecord"."userId" = :uid`, { uid: user.id })
            .andWhere(`"voteRecord"."commentId" = :cid`, { cid: params.commentId })
            .getOne();

        // Also load the relevant comment to update the counters;
        // TODO: Move the update to SQL? Stored procedure or something?
        const query_comment: Promise<Comment | undefined> = getConnection()
            .createQueryBuilder(Comment, "comment")
            .select()
            .whereInIds([params.commentId])
            .getOne();

        const existingRecord: VoteCommentRecord | undefined = await query_existingRecord;
        let query_upsertRecord: Promise<void>;
        if (!existingRecord) {
            const record = new VoteCommentRecord(params.commentId, user.id, params.episodeId, params.wasVotePositive);

            query_upsertRecord = getConnection().createQueryBuilder(VoteCommentRecord, "voteRecord")
                .insert()
                .values([record])
                .execute() as unknown as Promise<void>;
        } else if (existingRecord.wasVotePositive !== params.wasVotePositive) {
            query_upsertRecord = getConnection()
                .createQueryBuilder(VoteCommentRecord, "")
                .update()
                .where(`"userId" = :uid`, { uid: user.id })
                .andWhere(`"commentId" = :cid`, { cid: params.commentId })
                .set({ wasVotePositive: params.wasVotePositive })
                .execute() as unknown as Promise<void>;
        } else {
            console.error("\n== bogus request to set a vote's value to it's former value (no change)\n");
            return;
        }

        // TODO: update user karma - not who is voting but whoever owns the comment

        const comment_res: Comment | undefined = await query_comment;
        console.assert(comment_res);
        const comment = comment_res as Comment;

        if (existingRecord) {
            comment.upVotes -= ~~existingRecord.wasVotePositive;
            comment.downVotes -= ~~!existingRecord.wasVotePositive;
        }
        comment.upVotes += ~~params.wasVotePositive;
        comment.downVotes += ~~!params.wasVotePositive;

        console.log(comment.id);
        console.log(comment.upVotes);
        console.log(comment.downVotes);

        const query_updateCommentCounters = getConnection().createQueryBuilder(Comment, "comment")
            .update()
            .whereInIds([comment.id])
            .set({ upVotes: comment.upVotes, downVotes: comment.downVotes })
            .execute();

        await Promise.all([query_upsertRecord, query_updateCommentCounters]);
        response.end();
    }

    private static async revertVote(request: Request, response: Response): Promise<void> {
        const params = {
            commentId: ~~request.body.commentId
        };
        console.log("\n== revertVote - Received params: ", JSON.stringify(params));

        const user: User = request.user! as User;
        console.assert(user);

        const wasVotePositive: boolean = await QB(VoteCommentRecord, "voteRecord")
            .delete()
            .where(`"userId" = :id`, user)
            .andWhere(`"commentId" = :cid`, { cid: params.commentId })
            .returning(`"wasVotePositive"`)
            .execute() as unknown as boolean;

        // update the counters to the relevant comment
        if (wasVotePositive) {
            await getConnection().createQueryBuilder()
                .update(Comment)
                .set({ upVotes: () => `"upVotes" - 1` })
                .execute();
        } else {
            await getConnection().createQueryBuilder()
                .update(Comment)
                .set({ downVotes: () => `"downVotes" - 1` })
                .execute();
        }

        response.end();
    }

    private static async postComment(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: request.body.episodeId as number,
            commentToReplyToId: request.body.commentToReplyToId as number | null,
            timepointSeconds: ~~request.body.timepointSeconds as number,
            content: request.body.content as string
        };
        console.log("\n== postComment - Received params: ", JSON.stringify(params));

        console.assert(params.content.length);

        const query_episode: Promise<Episode | undefined> = getConnection()
            .createQueryBuilder(Episode, "episode")
            .whereInIds([params.episodeId])
            .getOne();

        const user: User = request.user! as User;
        console.assert(user);

        const newComment = new Comment();
        newComment.content = params.content;
        newComment.date = new Date();
        newComment.downVotes = 0;
        newComment.upVotes = 0;
        newComment.timepoint = new Timepoint(params.timepointSeconds);
        newComment.authorId = user.id;
        newComment.authorName = user.shortName;
        newComment.episodeId = (await query_episode)!.id;
        newComment.replies = [];

        // This operation is impossible to write with SQL Builder
        // unless we basically copy/paste the code from TypeORM here which would make it hardly readable
        // Prefer repository.save instead
        const commentRepo = getConnection().getTreeRepository(Comment);
        if (params.commentToReplyToId) {
            const query_parentComment: Promise<Comment | undefined> = commentRepo.findOne(params.commentToReplyToId);
            const parentComment = await commentRepo.findDescendantsTree((await query_parentComment)!);
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

    private static async deleteComment(request: Request, response: Response): Promise<void> {
        const params = {
            commentId: request.body.commentId as number
        };
        console.log("\n== deleteComment - Received params: ", JSON.stringify(params));

        const user: User = request.user! as User;
        console.assert(user);

        // Replace the comment's content and user
        const deletedCommentValues: QueryDeepPartialEntity<Comment> = {
            authorId: User.deletedUserId,
            authorName: User.deletedUserName,
            content: Comment.deletedCommentContents
        };

        // TODO: Check and report errors
        await getConnection()
            .createQueryBuilder()
            .update(Comment)
            .where(`"id" = :commentId`, params)
            .andWhere(`"authorId" = :id`, user)
            .set(deletedCommentValues)
            .execute();

        response.end();
    }
}
