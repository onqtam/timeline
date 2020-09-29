<template>
    <div class="timeline-player">
        <div class="controls">
            <VButton class="play-button" @click=togglePlay>
                Play/Pause
            </VButton>
            <audio nocontrols
                class="audio-element"
                ref="audio-element"
                :src=audio.filepath
            >
            </audio>
            <div class="slider-controls">
                <label>Number Of Timeslots</label>
                <VSlider class="timeslot-count-slider" :min=1 :max=5 :step=1 :value.sync=audioWindowTimeslotCount></VSlider>
            </div>
            <div class="slider-controls">
                <label>Audio Window Size</label>
                <VSlider class="window-width-count-slider" :min=30 :max=300 :step=30 :value.sync=audioWindowDuration></VSlider>
            </div>
        </div>
        <Timeline
            class="timeline"
            ref="timeline"
            :mode=TimelineMode.Standard
            :audioWindow=audioWindow
            :numberOfMarks=timelineMarkCount
            :rangeStart=0 :rangeEnd=audio.duration
            :currentAudioPosition=audioPos
            @update:audioWindowStart=onTimelineWindowMoved
        >
        </Timeline>
        <AgendaComponent
            class="agenda"
            v-if=activeEpisode
            :agenda=activeEpisode.agenda
        >
        </AgendaComponent>
        <Timeline
            class="zoomline"
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
import { Component, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";

import VButton from "../primitives/VButton.vue";
import VSlider from "../primitives/VSlider.vue";
import { default as Timeline, TimelineMode } from "./Timeline.vue";
import AgendaComponent from "./Agenda.vue";
import { Episode } from "@/logic/entities/Episode";
import { ActiveAppMode } from "../../store/StoreDeviceInfoModule";

@Component({
    components: {
        VButton,
        VSlider,
        Timeline,
        AgendaComponent
    }
})
export default class TimelinePlayer extends Vue {
    // Props
    public get audio(): AudioFile {
        return store.state.listen.audioFile;
    }
    public get audioWindow(): AudioWindow {
        return store.state.listen.audioWindow;
    }
    public get audioWindowTimeslotCount(): number {
        return this.audioWindow.timeslotCount;
    }
    public set audioWindowTimeslotCount(value: number) {
        store.commit.listen.setAudioWindowSlots(value);
    }
    public get audioWindowDuration(): number {
        return this.audioWindow.duration;
    }
    public set audioWindowDuration(value: number) {
        store.commit.listen.resizeAudioWindow(value);
    }
    public get volume(): number {
        return store.state.listen.volume;
    }
    public get audioPos(): Timepoint {
        return store.state.listen.audioPos;
    }
    public get activeEpisode(): Episode {
        return store.state.listen.activeEpisode;
    }
    private get zoomlineRangeStart(): number {
        return this.audioWindow.start.seconds;
    }
    private get zoomlineRangeEnd(): number {
        const seconds: number = this.audioWindow.start.seconds + this.audioWindow.duration;
        return Math.min(seconds, this.audio.duration);
    }
    private get zoomlineMarkCount(): number {
        return store.state.listen.audioWindow.timeslotCount + 1;
    }
    private timelineMarkCount: number = -1;

    // Store the enum as a member to access it in the template
    private TimelineMode = TimelineMode;

    // Internal Data members
    private get audioElement(): HTMLAudioElement {
        return this.$refs["audio-element"] as HTMLAudioElement;
    }
    private audioPlayTimeIntervalId: number = -1;
    private activeAppMode: ActiveAppMode = ActiveAppMode.StandardScreen;

    // Public API
    public mounted(): void {
        this.onWindowResized();
        store.commit.device.addOnAppModeChangedListener(this.onWindowResized.bind(this));
    }
    public destroyed(): void {
        store.commit.device.removeOnAppModeChangedistener(this.onWindowResized.bind(this));
    }
    public seekTo(secondToSeekTo: number): void {
        store.commit.listen.moveAudioPos(secondToSeekTo);
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
        this.audioElement.currentTime = this.audioPos.seconds;
        this.audioElement.volume = this.volume;
        this.audioElement.play();
        this.audioPlayTimeIntervalId = window.setInterval(() => this.updateAudioPos(), 16);
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
        store.commit.listen.moveAudioPos(this.audioElement.currentTime);
        const isInSync: boolean = this.isTimelineWindowSynced();
        if (wasInSync && !isInSync) {
            const newWindowPos = this.audioWindow.start.seconds + this.audioWindow.duration;
            store.commit.listen.moveAudioWindow(newWindowPos);
        }

        if (this.audioPos.seconds >= this.audio.duration) {
            this.pause();
        }
    }
    private onZoomlinePositionMoved(newValue: number): void {
        this.seekTo(newValue);
    }
    private onTimelineWindowMoved(newValue: number): void {
        store.commit.listen.moveAudioWindow(newValue);
    }

    private onWindowResized(): void {
        switch (store.state.device.device.appMode) {
        case ActiveAppMode.LargeDesktop:
            this.timelineMarkCount = 12;
            break;
        case ActiveAppMode.StandardScreen:
            this.timelineMarkCount = 10;
            break;
        case ActiveAppMode.Tablet:
            this.timelineMarkCount = 5;
            break;
        case ActiveAppMode.Mobile:
            this.timelineMarkCount = 3;
            break;
        }
    }
};

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

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

.timeline-player {
    display: grid;
    grid-template-areas:
        "controls controls"
        "timeline agenda"
        "zoomline zoomline";
    @control-row-height: 25.5%;
    @gap-size: 2.5%;
    gap: @gap-size;
    // Make sure the sum of all row heights and the gap equals 100% and the repeat for the width of all cols
    @gap-per-row: @gap-size * 2 / 3; // 2 gaps between 3 rows, distribute their height equally among all rows
    @gap-per-col: @gap-size * 1 / 2; // 1 gap between 2 cols
    grid-template-rows: @control-row-height - @gap-per-row (100%-@control-row-height)/2 - @gap-per-row (100%-@control-row-height)/2 - @gap-per-row;
    grid-template-columns: 75% - @gap-per-col 25% - @gap-per-col;
}

.controls {
    grid-area: controls;
}
.timeline {
    grid-area: timeline;
}
.agenda {
    grid-area: agenda;
}
.zoomline {
    grid-area: zoomline;
}

.audio-element {
    display: none;
}

.play-button {
    margin: 0;
}
.slider-controls {
    width: 20%;
    display: inline-block;
}

</style>
