import { Request, Response } from "express";

import Comment from "../../logic/entities/Comments";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";
import { getConnection } from "typeorm";
import Timepoint from "../../logic/entities/Timepoint";
import User from "../../logic/entities/User";
import VoteCommentRecord from "../../logic/entities/UserRecords";
import UserActivity from "../../logic/entities/UserActivity";
import { Episode } from "../../logic/entities/Episode";

export default class CommentController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/comments/:episodeId/:intervalStart-:intervalEnd",
            verb: HTTPVerb.Get,
            callback: CommentController.getCommentThreadsFor
        }, {
            path: "/comments/histogram/:episodeId/",
            verb: HTTPVerb.Get,
            callback: CommentController.getCommentDensityChartData
        }, {
            path: "/comments/",
            verb: HTTPVerb.Post,
            callback: CommentController.postComment
        }, {
            path: "/comments/vote/",
            verb: HTTPVerb.Post,
            callback: CommentController.recordVote
        }, {
            path: "/comments/vote/",
            verb: HTTPVerb.Delete,
            callback: CommentController.revertVote
        }];
    }

    private static async getCommentThreadsFor(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.params.episodeId,
            intervalStart: ~~request.params.intervalStart,
            intervalEnd: ~~request.params.intervalEnd
        };
        console.log("Received params: ", JSON.stringify(params));

        const rootsWithinInterval: Comment[] = await getConnection()
            .createQueryBuilder(Comment, "comment")
            .where("comment.\"parentId\" is NULL") // Roots
            .where("comment.\"episodeId\" = :episodeId", params) // For this episode
            .andWhere("comment.\"timepointSeconds\" >= :intervalStart", params) // In the given interval
            .andWhere("comment.\"timepointSeconds\" <= :intervalEnd", params)
            .leftJoinAndSelect("comment.author", "author")
            .getMany();

        const getTreeOfRoot = async (c: Comment): Promise<Comment> => {
            // Normally we would to want to call commentRepository.findDescendantsTree to map the tree and be done...
            // but of course TypeORM doesn't allow one to simultaneously map the tree and join on another table
            // so we do this incredibly ugly thing (the part after getRawEntities) which was simply copied from the impl
            // of findDescendantsTree
            const commentRepository = getConnection().getTreeRepository(Comment);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const commentRepoAsAny = commentRepository as any;
            return commentRepository
                .createDescendantsQueryBuilder("comment", "commentClosure", c)
                .leftJoinAndSelect("comment.author", "author")
                .getRawAndEntities()
                .then(entitiesAndScalars => {
                    const relationMaps = commentRepoAsAny.createRelationMaps("comment", entitiesAndScalars.raw);
                    commentRepoAsAny.buildChildrenEntityTree(c, entitiesAndScalars.entities, relationMaps);
                    return c;
                });
        };
        const query_completeTrees: Promise<Comment[]> = Promise.all(rootsWithinInterval.map(getTreeOfRoot));
        const completeTrees: Comment[] = await query_completeTrees;
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
            .where("comment.\"episodeId\" = :episodeId", params) // For this episode
            .groupBy("\"timeslotIndex\"")
            .orderBy("\"timeslotIndex\"")
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

    private static async recordVote(request: Request, response: Response): Promise<void> {
        const params = {
            userId: ~~request.header("Timeline-User-Id")!,
            commentId: ~~request.body.commentId,
            wasVotePositive: request.body.wasVotePositive
        };
        console.log("Received params: ", JSON.stringify(params));

        // TODO: avoid looking up the activity id by changing the DB Schema to include the user directly
        const user: User = await getConnection()
            .createQueryBuilder(User, "user")
            .whereInIds([params.userId])
            .execute();

        const query_existingRecord: Promise<VoteCommentRecord | undefined> = getConnection()
            .createQueryBuilder(VoteCommentRecord, "voteRecord")
            .select()
            .where(
                "voteRecord.\"owningActivityId\" = :activityId AND voteRecord.\"commentId\" = :commentId",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { activityId: (user as any).activity_id, commentId: params.commentId }
            )
            .getOne();

        // Also load the relevant comment to update the counters;
        // TODO: Move the update to SQL? Stored procedure or something?
        const query_comment: Promise<Comment> = getConnection()
            .createQueryBuilder(Comment, "comment")
            .select()
            .whereInIds([params.commentId])
            .execute();

        const existingRecord: VoteCommentRecord | undefined = await query_existingRecord;
        let query_upsertRecord: Promise<void>;
        if (!existingRecord) {
            const userActivity: UserActivity = await getConnection()
                .createQueryBuilder(UserActivity, "activity")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .whereInIds([(user as any).activity_id])
                .execute();

            const record = new VoteCommentRecord();
            record.commentId = params.commentId;
            record.wasVotePositive = params.wasVotePositive;
            record.owningActivity = userActivity;

            query_upsertRecord = getConnection()
                .createQueryBuilder(VoteCommentRecord, "voteRecord")
                .insert()
                .values([record])
                .execute() as unknown as Promise<void>;
        } else {
            query_upsertRecord = getConnection()
                .createQueryBuilder(VoteCommentRecord, "voteRecord")
                .update()
                .where(
                    "voteRecord.\"owningActivityId\" = :activityId AND voteRecord.\"commentId\" = :commentId",
                    { activityId: user.activity.id, commentId: params.commentId }
                )
                .set({ wasVotePositive: params.wasVotePositive })
                .execute() as unknown as Promise<void>;
        }

        const comment: Comment = await query_comment;
        if (existingRecord) {
            comment.upVotes -= ~~existingRecord.wasVotePositive;
            comment.downVotes -= ~~!existingRecord.wasVotePositive;
        }
        comment.upVotes += ~~params.wasVotePositive;
        comment.downVotes += ~~!params.wasVotePositive;
        const query_updateCommentCounters = getConnection()
            .createQueryBuilder(Comment, "comment")
            .update()
            .whereInIds([comment.id])
            .set({ upVotes: comment.upVotes, downVotes: comment.downVotes })
            .execute();

        await query_upsertRecord;
        await query_updateCommentCounters;
        response.end();
    }

    private static async revertVote(request: Request, response: Response): Promise<void> {
        const params = {
            userId: ~~request.header("Timeline-User-Id")!,
            commentId: ~~request.body.commentId
        };
        console.log("Received params: ", JSON.stringify(params));

        // TODO: avoid looking up the user & activity id by changing the DB Schema to include the user directly
        const user: User = await getConnection()
            .createQueryBuilder(User, "user")
            .whereInIds([params.userId])
            .execute();

        const existingRecord: VoteCommentRecord = await getConnection()
            .createQueryBuilder(VoteCommentRecord, "voteRecord")
            .delete()
            .where(
                "voteRecord.\"owningActivityId\" = :activityId AND voteRecord.\"commentId\" = :commentId",
                { activityId: user.activity.id, commentId: params.commentId }
            )
            .returning("voteRecord")
            .execute() as unknown as VoteCommentRecord;

        // Also load the relevant comment to update the counters
        const comment: Comment = await getConnection()
            .createQueryBuilder(Comment, "comment")
            .select()
            .whereInIds([params.commentId])
            .execute();

        comment.upVotes -= ~~existingRecord.wasVotePositive;
        comment.downVotes -= ~~!existingRecord.wasVotePositive;

        await getConnection()
            .createQueryBuilder(Comment, "comment")
            .update()
            .whereInIds([comment.id])
            .set({ upVotes: comment.upVotes, downVotes: comment.downVotes })
            .execute();

        response.end();
    }

    private static async postComment(request: Request, response: Response): Promise<void> {
        console.log("ma h ", request.body);
        const params = {
            userId: ~~request.header("Timeline-User-Id")!,
            episodeId: request.body.episodeId as number,
            commentToReplyToId: request.body.commentToReplyToId as number | null,
            timepointSeconds: ~~request.body.timepointSeconds as number,
            content: request.body.content as string
        };
        console.log("Received params: ", JSON.stringify(params));

        const query_user: Promise<User | undefined> = getConnection()
            .createQueryBuilder(User, "user")
            .whereInIds([params.userId])
            .getOne();
        const query_episode: Promise<Episode | undefined> = getConnection()
            .createQueryBuilder(Episode, "episode")
            .whereInIds([params.episodeId])
            .getOne();

        const newComment = new Comment();
        newComment.content = params.content;
        newComment.date = new Date();
        newComment.downVotes = 0;
        newComment.upVotes = 0;
        newComment.timepoint = new Timepoint(params.timepointSeconds);
        newComment.author = (await query_user)!;
        newComment.episode = (await query_episode)!;
        newComment.replies = [];

        const commentRepo = getConnection().getTreeRepository(Comment);

        // TODO: Rework the calls to treeRepo.save as SQL queries
        if (params.commentToReplyToId) {
            const query_parentComment: Promise<Comment | undefined> = commentRepo.findOne(params.commentToReplyToId);
            const parentComment = await commentRepo.findDescendantsTree((await query_parentComment)!);
            if (parentComment.replies === undefined) {
                parentComment.replies = [];
            }
            newComment.parentComment = parentComment;
            parentComment.replies.push(newComment);
            await commentRepo.save(parentComment);
        }
        await commentRepo.save(newComment);

        response.end();
    }
}
