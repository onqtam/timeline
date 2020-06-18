import Timepoint from "./Timepoint";

export default class AudioFile {
    public filepath: string = "";
    // In seconds
    public duration: number = 0;
}

export class AudioWindow {
    public start!: Timepoint;
    public duration!: number;
    public timeslotDuration!: number;

    public get timeslotCount(): number {
        return ~~(this.duration / this.timeslotDuration);
    }

    constructor(start?: Timepoint, duration?: number, timeslotDuration?: number) {
        this.start = start!;
        this.duration = duration!;
        this.timeslotDuration = timeslotDuration!;
    }

    public containsTimepoint(timepoint: Timepoint): boolean {
        const rangeStart = this.start.seconds;
        const rangeEnd = rangeStart + this.duration;
        return timepoint.seconds >= rangeStart && timepoint.seconds <= rangeEnd;
    }
}
