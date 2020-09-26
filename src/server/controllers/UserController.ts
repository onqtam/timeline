import { Request, Response } from "express";
import { getConnection } from "typeorm";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";
import User from "../../logic/entities/User";

export default class UserController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/user",
            verb: HTTPVerb.Get,
            requiresAuthentication: true,
            callback: UserController.getActiveUser
        }];
    }

    private static async getActiveUser(request: Request, response: Response): Promise<void> {
        response.end(EncodingUtils.jsonify(request.user!));
    }
}
