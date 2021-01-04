import Timepoint from "./entities/Timepoint";

export default class AudioFile {
    public filepath: string = "";
    // In seconds
    public duration: number = 0;
}

export class AudioWindow {
    public audioFile!: AudioFile;
    public start!: Timepoint;
    public duration!: number;
    public timeslotCount!: number;

    public get timeslotDuration(): number {
        return ~~(this.duration / this.timeslotCount);
    }
    public set timeslotDuration(value: number) {
        this.timeslotCount = ~~(this.duration / value);
    }

    constructor(audioFile: AudioFile, start?: Timepoint, duration?: number, timeslotCount?: number) {
        this.audioFile = audioFile;
        this.start = start!;
        this.duration = duration!;
        this.timeslotCount = timeslotCount!;
    }

    public containsTimepoint(time: Timepoint|number): boolean {
        const seconds: number = time instanceof Timepoint ? time.seconds : time;
        const rangeStart = this.start.seconds;
        const rangeEnd = rangeStart + this.duration;
        return seconds >= rangeStart && seconds <= rangeEnd;
    }

    public findTimeslotStartForTime(time: Timepoint|number): number {
        const seconds: number = time instanceof Timepoint ? time.seconds : time;
        // we want to position the window so that the cursor is always at 10%, except in the corner cases
        return Math.min(Math.max(0, seconds - this.duration * 1 / 10), this.audioFile.duration - this.duration);
    }
}
