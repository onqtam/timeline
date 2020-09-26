export default class CommonParams {
    public static readonly APIServerIP: string = "localhost";
    public static readonly ServerDomain: string = "lvh.me";
    public static readonly APIServerPort: number = 8000;
    public static readonly APIRouteName: string = "/api";
    public static get APIServerRootURL(): string {
        return `http:\\\\${CommonParams.ServerDomain}:${CommonParams.APIServerPort}${CommonParams.APIRouteName}`;
    }
    public static readonly ClientServerPort: number = 8080;
    public static get ClientServerRootURL(): string {
        return `http:\\\\${CommonParams.ServerDomain}:${CommonParams.ClientServerPort}`;
    }
    // TODO: Move to a compile time constant?
    public static readonly IsRunningOnClient: boolean = "document" in globalThis;
}
