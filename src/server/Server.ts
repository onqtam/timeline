import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { createConnection } from "typeorm";

import CommonParams from "../logic/CommonParams";
import RouteInfo from "./RouteInfo";
import CommentController from "./controllers/CommentController";
import PodcastController from "./controllers/PodcastController";

export default class Server {
    public app: express.Application;

    constructor() {
        this.app = express();
        this.app.use(bodyParser.json());
        // Enable CORS in dev environment
        // TODO: Block this in production
        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }

    public async init(): Promise<void> {
        // Init connection as early as possible
        const dbConnection = createConnection();

        // Ask all controllers for routes and register them
        let routes: RouteInfo[] = [];
        routes = routes.concat(CommentController.getRoutes());
        routes = routes.concat(PodcastController.getRoutes());

        for (const route of routes) {
            this.app[route.verb](route.path, (request: Request, response: Response, next: Function) => {
                response.setHeader("Content-Type", "application/json");
                route.callback(request, response)
                    .then(() => next)
                    .catch(err => next(err));
            });
        }

        // Initialization is done, start listening
        this.app.listen(CommonParams.APIServerPort, CommonParams.APIServerIP, () => {
            console.log(`API server is listening on http://localhost:${CommonParams.APIServerPort}`);
        });
        // Hide implementation details about the promise type
        return dbConnection as unknown as Promise<void>;
    }
}
