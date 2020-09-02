import DBTools from "./utils/dbtools";
import yargs from "yargs";
import User from '@/logic/entities/User';

async function updateExternalData(): Promise<void> {
    await DBTools.initDatabaseConnection();
    await DBTools.updatePodcastInfo();
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
            "update", "Updates any externally fetched data like Podcast info", {},
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
