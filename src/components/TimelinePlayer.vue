<template>
    <div class="timeline-player">
        <VButton @click=togglePlay>
            Play/Pause
        </VButton>
        <audio nocontrols
            ref="audio-element"
            :src=audio.filepath
        >
        </audio>
        <Timeline
            :mode=TimelineMode.Standard
            :audioWindow=audioWindow
            :numberOfMarks=10
            :rangeStart=0 :rangeEnd=audio.duration
            :currentAudioPosition=audioPos
            @update:audioWindowStart=onTimelineWindowMoved
        >
        </Timeline>
        <Timeline
            ref="zoomline"
            :mode=TimelineMode.Zoomline
            :numberOfMarks=zoomlineMarkCount
            :rangeStart=zoomlineRangeStart :rangeEnd=zoomlineRangeEnd
            :currentAudioPosition=audioPos
            @update:currentAudioPosition=onZoomlinePositionMoved
        >
        </Timeline>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import store from "@/store";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/Timepoint";

import VButton from "./primitives/VButton.vue";
import { default as Timeline, TimelineMode } from "./Timeline.vue";

@Component({
    components: {
        VButton,
        Timeline
    }
})
export default class TimelinePlayer extends Vue {
    // Props
    @Prop({ type: Timepoint })
    public initialAudioPos!: Timepoint;

    public get audio(): AudioFile {
        return store.state.listen.audioFile;
    }
    public get audioWindow(): AudioWindow {
        return store.state.listen.audioWindow;
    }
    public get volume(): number {
        return store.state.listen.volume;
    }

    public get audioPos(): Timepoint {
        return store.state.listen.audioPos;
    }
    private get zoomlineRangeStart(): number {
        return this.audioWindow.start.seconds;
    }
    private get zoomlineRangeEnd(): number {
        const seconds: number = this.audioWindow.start.seconds + this.audioWindow.duration;
        return Math.min(seconds, this.audio.duration);
    }
    private get zoomlineMarkCount(): number {
        return store.state.listen.audioWindow.timeslotCount;
    }

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
        store.commit.listen.moveAudioPos(this.initialAudioPos.seconds);
        this.onTimelineWindowMoved(this.audioPos.seconds);
    }
    public syncTo(secondToSyncTo: number): void {
        store.commit.listen.moveAudioPos(secondToSyncTo);
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
        const start: number = this.audioWindow.start.seconds;
        return this.audioPos.seconds >= this.audioWindow.start.seconds &&
            this.audioPos.seconds <= start + this.audioWindow.duration;
    }
    private updateAudioPos(): void {
        const wasInSync: boolean = this.isTimelineWindowSynced();
        this.audioPos.seconds = this.audioElement.currentTime;
        const isInSync: boolean = this.isTimelineWindowSynced();
        if (wasInSync && !isInSync) {
            const newWindowPos = this.audioWindow.start.seconds + this.audioWindow.duration;
            this.onTimelineWindowMoved(newWindowPos);
        }

        if (this.audioPos.seconds >= this.audio.duration) {
            this.pause();
        }
    }
    private onZoomlinePositionMoved(newValue: number): void {
        this.syncTo(newValue);
    }
    private onTimelineWindowMoved(newValue: number): void {
        store.commit.listen.moveAudioWindow(newValue);
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
