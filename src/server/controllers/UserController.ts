import { Request, Response } from "express";
import { getConnection } from "typeorm";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from '../../logic/HTTPVerb';
import User from '../../logic/entities/User';

export default class UserController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/user",
            verb: HTTPVerb.Get,
            callback: UserController.getActiveUser
        }];
    }

    private static async getActiveUser(request: Request, response: Response): Promise<void> {
        const defaultUser: User|undefined = await getConnection()
            .createQueryBuilder(User, "user")
            .leftJoinAndSelect("user.activity", "activity")
            .leftJoinAndSelect("activity.voteRecords", "voteRecords")
            .getOne();
        response.end(EncodingUtils.jsonify(defaultUser!));
    }
}
