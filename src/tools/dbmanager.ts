import DBTools from "./utils/DBTools";
import yargs from "yargs";
import User from "@/logic/entities/User";

async function updateExternalData(): Promise<void> {
    await DBTools.initDatabaseConnection();
    await DBTools.updateChannelInfo();
}

async function randomizeInternalData(): Promise<void> {
    await DBTools.initDatabaseConnection();
    await DBTools.cleanUpComments();
    await DBTools.cleanUpUsers();
    const users: User[] = await DBTools.randomizeUsers();
    await DBTools.randomizeComments(users);
}

async function main(): Promise<void> {
    // eslint-disable-next-line no-unused-expressions
    yargs
        .demandCommand(1)
        .command(
            "update", "Updates any externally fetched data like Channel info", {},
            async () => await updateExternalData()
        )
        .command(
            "randomize", "Randomizes any internally generated data like user accounts and comments",
            async () => await randomizeInternalData()
        )
        .help()
        .argv;
};

main();
