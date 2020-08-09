// Typings for the pgtools npm module which we use to create/drop the database
/* eslint-disable */
/// <reference path="../../node_modules/pgtools/index.js" />
/* eslint-enable */
declare module "pgtools" {
    class ConfigOptions {
        public user: string;
        public password: string;
        public port: number;
        public host: string;
    }

    function createdb(config: ConfigOptions, dbName: string): Promise<string>;
    function dropdb(config: ConfigOptions, dbName: string): Promise<string>;
}
