import express, { Request, Response } from "express";
import cron from "node-cron";
import bodyParser from "body-parser";
import expressSession from "express-session";
import { createConnection } from "typeorm";
import passport from "passport";

import CommonParams from "../logic/CommonParams";
import RouteInfo from "./RouteInfo";
import CommentController from "./controllers/CommentController";
import ChannelController from "./controllers/ChannelController";
import UserController from "./controllers/UserController";
import AuthenticationController from "./controllers/AuthenticationController";
import User from "../logic/entities/User";

export default class Server {
    public app: express.Application;

    constructor() {
        this.app = express();
        this.app.use(bodyParser.json());
        // Enable CORS in dev environment
        // TODO: Block this in production
        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "http://lvh.me:8080");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
            res.header("Access-Control-Allow-Credentials", "true");
            next();
        });
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 1);
        this.app.use(expressSession({
            secret: AuthenticationController.sessionSecret,
            cookie: { expires: expirationDate, secure: false },
            resave: true,
            saveUninitialized: true
        }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        AuthenticationController.setupPassport();
    }

    public async init(): Promise<void> {
        // Init connection as early as possible
        const dbConnection = createConnection();

        // Ask all controllers for routes and register them
        const authRoutes = AuthenticationController.getRoutes();
        // Appends the root route to the given one
        const fixRoutePath = (path: string) => CommonParams.APIRouteName + path;
        for (const route of authRoutes) {
            this.app[route.verb](fixRoutePath(route.path), route.callback);
        }

        let routes: RouteInfo[] = [];
        routes = routes.concat(CommentController.getRoutes());
        routes = routes.concat(ChannelController.getRoutes());
        routes = routes.concat(UserController.getRoutes());

        for (const route of routes) {
            const routeMiddlewares: Array<express.RequestHandler> = [];
            if (route.requiresAuthentication) {
                routeMiddlewares.push(AuthenticationController.getAuthorizationMiddleware());
            }
            routeMiddlewares.push((request: Request, response: Response, next: Function) => {
                route.callback(request, response)
                    .then(() => next)
                    .catch(err => next(err));
            });
            this.app[route.verb](fixRoutePath(route.path), ...routeMiddlewares);
        }
        // Catch-all, error reporter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.app.use((err: any, _req: any, res: any, _next: Function) => {
            console.log("this.app.use error caught")
            console.error(err);
            res.status(500).send(err.message);
        });

        // Initialization is done, start playing
        this.app.listen(CommonParams.APIServerPort, CommonParams.APIServerIP, () => {
            console.log(`API server is playing on http://localhost:${CommonParams.APIServerPort}`);
        });
        await dbConnection;

        cron.schedule("* * * * *", () => {
            // console.log("running a task every minute");
        });

        // Hide implementation details about the promise type
        return User.initSpecialUsers() as unknown as Promise<void>;
    }
}
