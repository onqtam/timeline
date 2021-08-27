// A better class for managing timepoints in the played content

import { Column } from "typeorm";

// Use instead of number where possible
export default class Timepoint {
    @Column()
    public seconds: number;

    constructor(seconds?: number) {
        this.seconds = seconds || 0;
        this.normalize();
    }

    private static tryParse(text: string, minSections: number, delimiter: string): Timepoint | undefined {
        const elements = text?.split(delimiter);
        if (!elements || elements.length < minSections || elements.length > 3) {
            return undefined;
        }
        const timeComponents: number[] = elements.map(e => ~~e);
        const seconds: number = timeComponents.pop()!;
        const minutes: number = timeComponents.pop() || 0;
        const hours: number = timeComponents.pop() || 0;
        return new Timepoint(hours * 3600 + minutes * 60 + seconds);
    }

    public static tryParseFromFormattedText(text: string, minSections = 2): Timepoint | undefined {
        return Timepoint.tryParse(text, minSections, ":");
    }

    public static tryParseFromURL(text: string): Timepoint | undefined {
        return Timepoint.tryParse(text, 1, "-");
    }

    // Rounds the seconds to the nearest second to avoid any sub-second instability
    // All timepoints should be normalized before being used
    public normalize(): void {
        this.seconds = Math.round(this.seconds);
    }

    public formatAsUrlParam(): string {
        return this.formatExtended("-", true);
    }

    public static FullFormat(value: number): string {
        return (new Timepoint(value)).formatExtended(":", false);
    }

    public format(): string {
        return this.formatExtended(":", true);
    }

    public fullFormat(): string {
        return this.formatExtended(":", false);
    }

    private formatExtended(delimiter: string, dropNumbersIfPossible: boolean): string {
        let mutableSeconds = this.seconds;
        const hours = Math.floor(mutableSeconds / 3600);
        mutableSeconds -= hours * 3600;
        const minutes = Math.floor(mutableSeconds / 60);
        mutableSeconds -= minutes * 60;
        const leftOverSeconds = mutableSeconds;
        // tc for time component; short name to make the usage easier
        const tc = (val: number) => this._formatTimeComponent(val);

        if (dropNumbersIfPossible && minutes === 0 && hours === 0) {
            return `${tc(leftOverSeconds)}`;
        }
        if (dropNumbersIfPossible && hours === 0) {
            return `${tc(minutes)}${delimiter}${tc(leftOverSeconds)}`;
        }
        return `${tc(hours)}${delimiter}${tc(minutes)}${delimiter}${tc(leftOverSeconds)}`;
    }

    private _formatTimeComponent(value: number): string {
        return value.toFixed(0).padStart(2, "0");
    }
}
