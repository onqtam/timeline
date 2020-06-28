// A better class for managing timepoints in the played content
// Use instead of number where possible
export default class Timepoint {
    public seconds: number;

    constructor(seconds?: number) {
        this.seconds = seconds || 0;
    }

    public static tryParseFromFormattedText(text: string): Timepoint|null {
        const elements = text?.split(":");
        if (!elements || elements.length < 2 || elements.length > 3) {
            return null;
        }
        const timeComponents: number[] = elements.map(e => ~~e);
        const seconds: number = timeComponents.pop()!;
        const minutes: number = timeComponents.pop()!;
        const hours: number = timeComponents.pop() || 0;

        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return new Timepoint(totalSeconds);
    }

    public static tryParseFromURL(text: string): Timepoint|null {
        const elements = text?.split("-");
        if (!elements || elements.length !== 3) {
            return null;
        }
        const [hours, minutes, seconds]: number[] = elements.map(e => ~~e);

        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return new Timepoint(totalSeconds);
    }

    public formatAsUrlParam(): string {
        return this.formatExtended("-", false);
    }

    public format(): string {
        return this.formatExtended(":", true);
    }

    private formatExtended(delimiter: string, dropHoursIfPossible: boolean): string {
        let mutableSeconds = this.seconds;
        const hours = Math.floor(mutableSeconds / 3600);
        mutableSeconds -= hours * 3600;
        const minutes = Math.floor(mutableSeconds / 60);
        mutableSeconds -= minutes * 60;
        const leftOverSeconds = mutableSeconds;
        // tc for time component; short name to make the usage easier
        const tc = (val: number) => this._formatTimeComponent(val);

        if (dropHoursIfPossible && hours === 0) {
            return `${tc(minutes)}${delimiter}${tc(leftOverSeconds)}`;
        }
        return `${tc(hours)}${delimiter}${tc(minutes)}${delimiter}${tc(leftOverSeconds)}`;
    }

    private _formatTimeComponent(value: number): string {
        return value.toFixed(0).padStart(2, "0");
    }
}
