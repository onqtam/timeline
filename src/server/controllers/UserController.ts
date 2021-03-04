import { Request, Response } from "express";
import RouteInfo from "../RouteInfo";
import EncodingUtils from "../../logic/EncodingUtils";
import { HTTPVerb } from "../../logic/HTTPVerb";
import UserSettings from "../../logic/entities/UserSettings";
import User from "../../logic/entities/User";
import PlaybackProgressRecord from "../../logic/entities/PlaybackProgressRecord";
import { UserPlaybackActivity } from "../../logic/UserActivities";
import Timepoint from "../../logic/entities/Timepoint";
import { QBE } from "../utils/dbutils";

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
        }, {
            path: "/user/progress",
            verb: HTTPVerb.Get,
            requiresAuthentication: true,
            callback: UserController.getPlaybackProgress
        }, {
            path: "/user/progress",
            verb: HTTPVerb.Post,
            requiresAuthentication: true,
            callback: UserController.storePlaybackProgress
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
        await QBE(UserSettings, "settings")
            .update()
            .set(params.settings)
            .whereEntity(currentUser.settings)
            .execute();
        response.end();
    }

    private static async storePlaybackProgress(request: Request, response: Response): Promise<void> {
        const params = {
            episodeId: ~~request.body.episodeId,
            progress: ~~request.body.progressInSeconds
        };
        const currentUser: User = (request.user! as User);
        const newProgressRecord = new PlaybackProgressRecord();
        newProgressRecord.userId = currentUser.id;
        newProgressRecord.episodeId = params.episodeId;
        newProgressRecord.progress = new Timepoint(params.progress);

        await QBE(PlaybackProgressRecord, "progress")
            .insert()
            .into(PlaybackProgressRecord)
            .values(newProgressRecord)
            // This uses Postgre specific upsert syntax
            .onConflict(`("userId", "episodeId") DO UPDATE SET "progressSeconds" = excluded."progressSeconds"`)
            .execute();

        response.end();
    }

    private static async getPlaybackProgress(request: Request, response: Response): Promise<void> {
        const currentUser: User = (request.user! as User);

        const progressRecords: PlaybackProgressRecord[] = await QBE(PlaybackProgressRecord, "progress")
            .select()
            .where(`progress."userId" = :id`, currentUser)
            .getMany();

        const asUserActivities: UserPlaybackActivity[] = progressRecords.map(r => {
            return { episodeId: r.episodeId, progressInSeconds: r.progress.seconds };
        });
        response.end(EncodingUtils.jsonify(asUserActivities));
    }
}
