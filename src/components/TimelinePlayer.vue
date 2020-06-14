<template>
    <div class="timeline-player">
        <button @click=togglePlay>
            Play/Pause
        </button>
        <audio nocontrols
            ref="audio-element"
            :src=audio.filepath
        >
        </audio>
        <Timeline
            :mode=TimelineMode.Standard :standardModeParams=standardTimelineParams
            :numberOfMarks=10
            :rangeStart=0 :rangeEnd=audio.duration
            :currentAudioPosition=audioPos
            @update:windowStart=onTimelineWindowMoved
        >
        </Timeline>
        <Timeline
            ref="zoomline"
            :mode=TimelineMode.Zoomline
            :numberOfMarks=5
            :rangeStart=zoomlineRangeStart :rangeEnd=zoomlineRangeEnd
            :currentAudioPosition=audioPos
            @update:currentAudioPosition=onZoomlinePositionMoved
        >
        </Timeline>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { default as Timeline, TimelineMode, StandardModeParams } from "./Timeline.vue";
import { default as AudioFile } from "@/logic/AudioFile";
import Timepoint from "@/logic/Timepoint";

@Component({
    components: { Timeline }
})
export default class TimelinePlayer extends Vue {
    // Props
    @Prop({ type: AudioFile })
    public audio!: AudioFile;
    @Prop({ type: Number })
    public volume!: number;
    @Prop({ type: Timepoint })
    public initialAudioPos!: Timepoint;

    // Make the window start from 0 with a width of 1 minute
    private standardTimelineParams: StandardModeParams = new StandardModeParams(new Timepoint(0), 60);

    private get zoomlineRangeStart(): number {
        return this.standardTimelineParams.windowStart.seconds;
    }
    private get zoomlineRangeEnd(): number {
        const seconds: number = this.standardTimelineParams.windowStart.seconds + this.standardTimelineParams.windowDuration;
        return Math.min(seconds, this.audio.duration);
    }
    private audioPos: Timepoint = new Timepoint();

    // Store the enum as a member to access it in the template
    private TimelineMode = TimelineMode;

    // Internal Data members
    private get audioElement(): HTMLAudioElement {
        return this.$refs["audio-element"] as HTMLAudioElement;
    }
    private audioPlayTimeIntervalId: number = -1;

    // Public API
    public mounted(): void {
        // Move both the window and the audio pos during the initial render
        if (!this.initialAudioPos) {
            return;
        }
        console.assert(this.initialAudioPos.seconds >= 0 && this.initialAudioPos.seconds <= this.audio.duration);
        this.audioPos.seconds = this.initialAudioPos.seconds;
        this.standardTimelineParams.windowStart.seconds = this.audioPos.seconds;
    }
    public syncTo(secondToSyncTo: number): void {
        this.audioPos.seconds = secondToSyncTo;
        this.audioElement.currentTime = this.audioPos.seconds;
    }
    public togglePlay(): void {
        if (this.audioElement.paused) {
            this.play();
        } else {
            this.pause();
        }
    }
    public play(): void {
        this.audioElement.volume = this.volume;
        this.audioElement.play();
        this.audioPlayTimeIntervalId = setInterval(() => this.updateAudioPos(), 16);
    }
    public pause(): void {
        this.audioElement.pause();
        clearInterval(this.audioPlayTimeIntervalId);
    }

    // Private API
    private isTimelineWindowSynced(): boolean {
        const windowStart: number = this.standardTimelineParams.windowStart.seconds;
        return this.audioPos.seconds >= this.standardTimelineParams.windowStart.seconds &&
            this.audioPos.seconds <= windowStart + this.standardTimelineParams.windowDuration;
    }
    private updateAudioPos(): void {
        const wasInSync: boolean = this.isTimelineWindowSynced();
        this.audioPos.seconds = this.audioElement.currentTime;
        const isInSync: boolean = this.isTimelineWindowSynced();
        if (wasInSync && !isInSync) {
            this.standardTimelineParams.windowStart.seconds += this.standardTimelineParams.windowDuration;
        }

        if (this.audioPos.seconds >= this.audio.duration) {
            this.pause();
        }
    }
    private onZoomlinePositionMoved(newValue: number): void {
        this.syncTo(newValue);
    }
    private onTimelineWindowMoved(newValue: number): void {
        this.standardTimelineParams.windowStart.seconds = newValue;
    }
};

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../cssresources/theme.less";

h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
button {
    color: @theme-background;
    background: @theme-text-color;
}
</style>
