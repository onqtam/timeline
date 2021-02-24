import Timepoint from "./entities/Timepoint";
import MathHelpers from "@/logic/MathHelpers";

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
        console.log("🚀🚀🚀🚀🚀🚀🚀🚀🚀 ~ file: AudioFile.ts ~ line 24 ~ AudioWindow ~ constructor ~ constructor");
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
        console.log(seconds);
        console.log(this.audioFile.duration);
        console.log(this.duration);
        // we want to position the window so that the cursor is always at 10%, except in the corner cases
        return MathHelpers.clamp(seconds - this.duration * 0.1, 0, this.audioFile.duration - this.duration);
    }
}
