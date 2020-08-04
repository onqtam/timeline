import express, { Application } from "express";
import bodyParser from "body-parser";

import CommonParams from "../logic/CommonParams";

const app: Application = express();

// parse application/json
app.use(bodyParser.json());

app.use(function (req, res) {
    res.setHeader("Content-Type", "text/plain");
    res.write("you posted:\n");
    res.end(JSON.stringify(req.body, null, 2));
});

app.listen(CommonParams.APIServerPort, CommonParams.APIServerIP, () => {
    console.log(`API server is listening on http://localhost:${CommonParams.APIServerPort}`);
});
