import https from "https";
import { IncomingMessage } from "http";

export default class AsyncLoader {
    public static async fetchTextFile(url: string): Promise<string> {
        const promiseExecutor = (resolve: (result: string) => void, reject: (error: string) => void) => {
            https.get(url, (response: IncomingMessage) => {
                if (response.statusCode !== 200) {
                    reject(`Request failed. Status code: ${response.statusCode}`);
                    return;
                }
                response.setEncoding("utf8");
                let rawData = "";
                response
                    .on("data", (chunk: string) => { rawData += chunk; })
                    .on("end", () => resolve(rawData))
                    .on("error", (err: string) => reject(err));
            });
        };
        const promise: Promise<string> = new Promise<string>(promiseExecutor);
        return promise;
    }
}
