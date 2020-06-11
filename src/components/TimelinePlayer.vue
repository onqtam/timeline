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
            :look=topTimelineLook :numberOfMarks=10
            :rangeStart=0 :rangeEnd=audio.duration
            :currentAudioPosition=audioPos
            @update:currentAudioPosition=onTimelinePositionMoved
        >
        </Timeline>
        <Timeline
            ref="zoomline"
            :look=bottomZoomlineLook :numberOfMarks=5
            :rangeStart=zoomlineRangeStart :rangeEnd=zoomlineRangeEnd
            :currentAudioPosition=audioPos
            @update:currentAudioPosition=onTimelinePositionMoved
        >
        </Timeline>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { default as Timeline, TimelineLook } from "./Timeline.vue";
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

    private get zoomlineRangeStart(): number {
        return Math.floor(this.audioPos.seconds / 60) * 60;
    }
    private get zoomlineRangeEnd(): number {
        const minuteEnd = Math.floor(this.audioPos.seconds / 60 + 1) * 60;
        return Math.min(minuteEnd, this.audio.duration);
    }
    private audioPos: Timepoint = new Timepoint();

    // These constants are necessary as we can't use the TimelineLook enum in the template above since
    // it's an external object and Vue doesn't let you access external objects in templates
    private topTimelineLook: TimelineLook = TimelineLook.Line;
    private bottomZoomlineLook: TimelineLook = TimelineLook.Audiowave;
    // Internal Data members
    private get audioElement(): HTMLAudioElement {
        return this.$refs["audio-element"] as HTMLAudioElement;
    }
    private audioPlayTimeIntervalId: number = -1;

    // Public API
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
    private updateAudioPos(): void{
        this.audioPos.seconds = this.audioElement.currentTime;
        if (this.audioPos.seconds >= this.audio.duration) {
            this.pause();
        }
    }
    private onTimelinePositionMoved(newValue: number): void {
        this.audioPos.seconds = newValue;
        this.audioElement.currentTime = this.audioPos.seconds;
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
