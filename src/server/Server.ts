import express from "express";

import CommentController from "./CommentController";
import bodyParser from "body-parser";
import CommonParams from "../logic/CommonParams";

export default class Server {
    private app: express.Application;

    constructor() {
        this.app = express();
        this.app.use(bodyParser.json());
    }

    public init(): void {
        CommentController.registerRoutes(this.app);

        this.app.listen(CommonParams.APIServerPort, CommonParams.APIServerIP, () => {
            console.log(`API server is listening on http://localhost:${CommonParams.APIServerPort}`);
        });
    }
}
