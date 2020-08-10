import Server from "./Server";

const server: Server = new Server();

(async () => {
    await server.init();
})();

// Exporting the server is currently only done because of tests which need access to the express app.
export default server;
