export default class CommonParams {
    public static readonly APIServerIP: string = "localhost";
    public static readonly APIServerPort: number = 8000;
    public static get APIServerRootURL(): string {
        return `http:\\\\${CommonParams.APIServerIP}:${CommonParams.APIServerPort}`;
    }
    // TODO: Move to a compile time constant?
    public static readonly IsRunningOnClient: boolean = "document" in globalThis;
}
