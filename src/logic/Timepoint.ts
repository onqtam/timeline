// A better class for managing timepoints in the played content
// Use instead of number where possible
export default class Timepoint {
    public seconds: number;

    constructor(seconds?: number) {
        this.seconds = seconds || 0;
    }

    public format(): string {
        let mutableSeconds = this.seconds;
        const hours = Math.floor(mutableSeconds / 3600);
        mutableSeconds -= hours * 3600;
        const minutes = Math.floor(mutableSeconds / 60);
        mutableSeconds -= minutes * 60;
        const leftOverSeconds = mutableSeconds;
        const tc = (val: number) => this._formatTimeComponent(val);

        if (hours > 0) {
            return `${tc(hours)}:${tc(minutes)}:${tc(leftOverSeconds)}`;
        }
        return `${tc(minutes)}:${tc(leftOverSeconds)}`;
    }

    private _formatTimeComponent(value: number): string {
        return value.toFixed(0).padStart(2, "0");
    }
}
