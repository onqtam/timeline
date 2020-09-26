/// <reference types="express-session" />
import express, { Request, Response } from "express";
import passport from "passport";
import { OAuth2Strategy as GoogleStrategy } from "passport-google-oauth";
import { getConnection } from "typeorm";
import { AuthRouteInfo } from "../RouteInfo";
import { HTTPVerb } from "../../logic/HTTPVerb";
import User from "../../logic/entities/User";
import UserActivity from "../../logic/entities/UserActivity";

type PassportVerifyOptions = { message: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PassportVerifyFunction = (error: any, user?: any, msg?: PassportVerifyOptions) => void;
interface IUnpinchSession extends Express.Session {
    returnTo: string|undefined;
}

export default class AuthenticationController {
    // Temporary testing credentials
    public static readonly sessionSecret: string = "unpinch";
    public static readonly googleClientID: string = "820058663273-0rnloh0gt9b8hhtukbn21s8v9fn3aj3i.apps.googleusercontent.com";
    public static readonly googleClientSecret: string = "QsG90MiqmRgYlQArpk3qFTE8";

    public static getRoutes(): AuthRouteInfo[] {
        // Here's the sequence for Google authentication
        // 1. Client calls /auth/google and passes a returnTo URL
        // 2. Server redirects to Google's OAuth screen
        // 3. Google redirects to /auth/google/callback
        // 4. Server tells client where to redirect (returnTo URL)
        return [{
            path: "/auth/google",
            verb: HTTPVerb.Get,
            callback: AuthenticationController.beginGoogleAuth
        }, {
            path: "/auth/google/callback",
            verb: HTTPVerb.Get,
            callback: AuthenticationController.finishGoogleAuth
        }, {
            path: "/auth/google/callback",
            verb: HTTPVerb.Get,
            callback: AuthenticationController.redirectPostAuth
        }];
    }

    public static setupPassport(): void {
        passport.use(new GoogleStrategy({
            clientID: AuthenticationController.googleClientID,
            clientSecret: AuthenticationController.googleClientSecret,
            callbackURL: "callback"
        },
        AuthenticationController.verifyGoogleCredentials
        ));
        passport.serializeUser(function (user: User, done: PassportVerifyFunction): void {
            done(null, user.id);
        });
        passport.deserializeUser(function (id: number, done: PassportVerifyFunction): void {
            getConnection()
                .createQueryBuilder(User, "user")
                .select()
                .whereInIds([id])
                .leftJoinAndSelect("user.activity", "activity")
                .getOne()
                .then(
                    (user: User|undefined) => {
                        done(null, user!);
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (err: any) => {
                        done(err, null);
                    }
                );
        });
    }

    public static getAuthorizationMiddleware(): express.RequestHandler {
        return (request: Request, response: Response, next: Function) => {
            if (request.isAuthenticated()) {
                next();
            } else {
                response.status(403).end();
            }
        };
    }

    public static async verifyGoogleCredentials(token: string, tokenSecret: string, profile: passport.Profile, done: PassportVerifyFunction): Promise<void> {
        const googleProviderId: string = `${profile.provider}_${profile.id}`;
        const existingUser: User|undefined = await getConnection()
            .createQueryBuilder(User, "user")
            .leftJoinAndSelect("user.activity", "activity")
            .where("\"user\".\"externalProviderId\" = :providerId", { providerId: googleProviderId })
            .getOne();

        if (!existingUser) {
            const newUser = new User();
            newUser.shortName = profile.displayName;
            newUser.email = "test@test.com";
            newUser.externalProviderId = googleProviderId;
            newUser.activity = new UserActivity();
            newUser.activity.internalDBDummyValue = ~~(Math.random() * Number.MAX_SAFE_INTEGER);

            await getConnection()
                .createQueryBuilder(UserActivity, "activity")
                .insert()
                .values(newUser.activity)
                .execute();
            await getConnection()
                .createQueryBuilder(User, "user")
                .insert()
                .values(newUser)
                .execute();
        }

        const user: User|undefined = existingUser || await getConnection()
            .createQueryBuilder(User, "user")
            .leftJoinAndSelect("user.activity", "activity")
            .where("\"user\".\"externalProviderId\" = :providerId", { providerId: googleProviderId })
            .getOne();
        console.log("Logged in user: ", user);
        done(undefined, user!);
    }

    public static async beginGoogleAuth(request: Request, response: Response, next: Function): Promise<void> {
        const params = {
            returnTo: request.query.returnTo as string
        };
        if (params.returnTo) {
            request.session = request.session || {} as Express.Session;
            (request.session! as IUnpinchSession).returnTo = params.returnTo;
        }
        const passportAuthRule = passport.authenticate("google", {
            session: true,
            scope: ["https://www.googleapis.com/auth/plus.login"]
        });
        passportAuthRule(request, response, next);
    }

    public static async finishGoogleAuth(request: Request, response: Response, next: Function): Promise<void> {
        const passportAuthRule = passport.authenticate("google", {
            failureRedirect: "/login/failed",
            session: true
        });
        passportAuthRule(request, response, next);
    }

    public static async redirectPostAuth(request: Request, response: Response, _: Function): Promise<void> {
        const session = (request.session! as IUnpinchSession);
        const returnURL = session.returnTo || "/";
        // Our own redirect as the standard response.redirect doesn't work with other domains
        // because it tries to URL encode the target URL
        response.status(307).set("Location", returnURL);
        response.end();
    }
}
