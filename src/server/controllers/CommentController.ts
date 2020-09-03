import { Request, Response } from "express";

import Comment from "../../logic/entities/Comments";
import { RandomIntegerDistribution } from "../../logic/RandomHelpers";
import MathHelpers from "../../logic/MathHelpers";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from '../../logic/HTTPVerb';
import { getConnection, LessThanOrEqual, MoreThanOrEqual, FindManyOptions, Raw, getConnectionOptions } from 'typeorm';
import Timepoint from "../../logic/entities/Timepoint";
import User from "../../logic/entities/User";

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
        }
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
            timeslotIndex: number,
            commentCount: number
        };
        const commentTimeslotHistogram: CommentDensityRecord[] = await getConnection()
            .createQueryBuilder(Comment, "comment")
            .select(`comment.\"timepointSeconds\" / ${FIXED_TIMESLOT_SIZE}`, "timeslotIndex")
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
}
