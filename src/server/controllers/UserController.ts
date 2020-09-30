import { Request, Response } from "express";
import { getConnection } from "typeorm";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";
import UserSettings from "../../logic/entities/UserSettings";
import User from "../../logic/entities/User";

export default class UserController {
    public static getRoutes(): RouteInfo[] {
        return [{
            path: "/user",
            verb: HTTPVerb.Get,
            requiresAuthentication: true,
            callback: UserController.getActiveUser
        }, {
            path: "/user/settings",
            verb: HTTPVerb.Post,
            requiresAuthentication: true,
            callback: UserController.storeSettings
        }];
    }

    private static async getActiveUser(request: Request, response: Response): Promise<void> {
        response.end(EncodingUtils.jsonify(request.user!));
    }

    private static async storeSettings(request: Request, response: Response): Promise<void> {
        const params = {
            settings: request.body.settings as UserSettings
        };
        // Make sure to delete the ID field before updating - we never want to update it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (params.settings as any).id;
        const currentUser: User = (request.user! as User);
        await getConnection()
            .createQueryBuilder(UserSettings, "settings")
            .update()
            .set(params.settings)
            .whereEntity(currentUser.settings)
            .execute();
        response.end();
    }
}
