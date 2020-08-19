export default class CommonParams {
    public static readonly APIServerIP: string = "localhost";
    public static readonly APIServerPort: number = 8000;
    // TODO: Move to a compile time constant?
    public static readonly IsRunningOnClient: boolean = "document" in globalThis;
}
