<template>
    <div class="timeline-player">
        <div class="controls">
            <div class="slider-controls">
                <v-btn @click=togglePlay>
                    <v-icon v-if=isPaused>mdi-play</v-icon>
                    <v-icon v-else>mdi-pause</v-icon>
                </v-btn>
                <v-btn class="mute-button" @click=toggleMute>
                    <v-icon v-if="!isMuted && volume > 0.5">mdi-volume-high</v-icon>
                    <v-icon v-if="!isMuted && volume <= 0.5 && volume > 0">mdi-volume-medium</v-icon>
                    <v-icon v-if="isMuted || volume === 0">mdi-volume-off</v-icon>
                </v-btn>
                <!-- commented out for now - takes too much space and isn't useful for now -->
                <!-- <v-slider class="volume-slider" :min=0 :max=1 :step=0.01 :value.sync=volume></v-slider> -->
                <v-slider class="d-inline-block" style="width: 250px; margin-top: 20px;"
                    :max=audio.duration
                    min=1
                    label="Window Size" thumb-label="always"
                    v-model=windowDuration>
                </v-slider>

                <v-text-field label="Window Start" class="d-inline-block" style="width: 80px;"
                    v-mask="'##:##:##'"
                    autocomplete="off"
                    v-model=windowStartAsString
                    @change="windowStartChange"
                ></v-text-field>
                <v-text-field label="Window End" class="d-inline-block" style="width: 80px;"
                    v-mask="'##:##:##'"
                    autocomplete="off"
                    v-model=windowEndAsString
                    @change="windowEndChange"
                ></v-text-field>

                <v-btn>◄Unpinch►</v-btn>
                <v-btn>►Pinch◄</v-btn>

                <!-- TODO: use button-groups - mutually-exclusive toggles -->
                <v-btn>Comments</v-btn>
                <!-- <v-btn>Bookmarks</v-btn> -->

                <AgendaComponent
                    class="agenda"
                    v-if=activeEpisode
                    :currentAudioPosition=audioPos
                    :agenda=activeEpisode.agenda
                    :audioWindow=audioWindow
                >
                </AgendaComponent>

                <audio nocontrols
                    class="audio-element"
                    ref="audio-element"
                    :src=audio.filepath
                >
                </audio>
            </div>
        </div>
        <Annotations
            class="annotations"
            ref="annotations"
            :currentAudioPosition=audioPos
            :agenda=activeEpisode.agenda
            :audioWindow=audioWindow
        >
        </Annotations>
        <Timeline
            class="timeline"
            ref="timeline"
            :audioWindow=audioWindow
            :rangeStart=0 :rangeEnd=audio.duration
            :currentAudioPosition=audioPos
            @update:audioWindowStart=onTimelineWindowMoved
            @update:currentAudioPosition=onZoomlinePositionMoved
        >
        </Timeline>
        <Funnel
            class="funnel"
            ref="funnel"
            :duration_full=audio.duration
            :rangeStart_full=zoomlineRangeStart :rangeEnd_full=zoomlineRangeEnd
            :currentAudioPosition_full=audioPos
            :timelineWidthRatio=1.0
            @update:currentAudioPosition=onZoomlinePositionMoved
        >
        </Funnel>

        <Zoomline
            class="zoomline"
            ref="zoomline"
            :rangeStart=zoomlineRangeStart :rangeEnd=zoomlineRangeEnd
            :currentAudioPosition=audioPos
            @update:currentAudioPosition=onZoomlinePositionMoved
        >
        </Zoomline>
    </div>
</template>

<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";

import { default as Annotations } from "./Annotations.vue";
import { default as Timeline } from "./Timeline.vue";
import { default as Funnel } from "./Funnel.vue";
import { default as Zoomline } from "./Zoomline.vue";
import AgendaComponent from "./Agenda.vue";
import { Episode } from "@/logic/entities/Episode";
import { ActiveAppMode } from "../../store/StoreDeviceInfoModule";

@Component({
    components: {
        Annotations,
        Timeline,
        Funnel,
        Zoomline,
        AgendaComponent
    }
})
export default class TimelinePlayer extends Vue {
    public get audio(): AudioFile {
        return store.state.play.audioFile;
    }
    public get audioWindow(): AudioWindow {
        return store.state.play.audioWindow;
    }
    public get audioPos(): Timepoint {
        return store.state.play.audioPos;
    }

    // ================================================================
    // == window size & position
    // ================================================================

    get windowStart(): number {
        return this.audioWindow.start.seconds;
    }
    set windowStart(value: number) {
        store.commit.play.setAudioWindow({ start: value, end: this.windowEnd });
    }
    get windowEnd(): number {
        return this.audioWindow.end.seconds;
    }
    set windowEnd(value: number) {
        store.commit.play.setAudioWindow({ start: this.windowStart, end: value });
    }
    get windowDuration(): number {
        return this.audioWindow.duration;
    }
    set windowDuration(value: number) {
        let backward_offset = 0;
        // offset backward both the start and end of the window so that the duration fits
        if (this.windowStart + value > this.audio.duration) {
            backward_offset = this.windowStart + value - this.audio.duration;
        }
        store.commit.play.setAudioWindow({ start: this.windowStart - backward_offset, end: this.windowStart + value - backward_offset });
    }

    windowStartAsString = Timepoint.FullFormat(this.windowStart);
    windowStartChange() {
        const fromStr = Timepoint.tryParseFromFormattedText(this.windowStartAsString, 3);
        if (!fromStr || fromStr.seconds > this.windowEnd) {
            // if it cannot be parsed or is after the end - reset it
            this.windowStartAsString = Timepoint.FullFormat(this.windowStart);
            // TODO: perhaps we should not reset if it's after the window end but simply move the end by the duration?
        } else {
            this.windowStart = fromStr.seconds;
            // TODO: update the router path as well?
        }
    }

    windowEndAsString = Timepoint.FullFormat(this.windowEnd)
    windowEndChange() {
        const fromStr = Timepoint.tryParseFromFormattedText(this.windowEndAsString, 3);
        if (!fromStr) {
            // if it cannot be parsed - reset it
            this.windowEndAsString = Timepoint.FullFormat(this.windowEnd);
        } else {
            this.windowEnd = fromStr.seconds;
            // TODO: update the router path as well?
        }
    }

    // TODO: deep watching is slow!!! can we use mapState to avoid the x.y.z nesting when accessing the state?
    @Watch("audioWindow", { deep: true })
    private watchSomething() {
        this.windowStartAsString = Timepoint.FullFormat(this.windowStart);
        this.windowEndAsString = Timepoint.FullFormat(this.windowEnd);
    }

    // ================================================================
    // == other stuff
    // ================================================================

    public get volume(): number {
        return store.state.play.volume;
    }
    public set volume(value: number) {
        store.commit.play.setVolume(value);
        this.audioElement.volume = value;
    }
    public get isMuted(): boolean {
        return !this.audioElement || this.audioElement.muted;
    }
    public get isPaused(): boolean {
        return !this.audioElement || this.audioElement.paused;
    }
    public get activeEpisode(): Episode {
        return store.state.play.activeEpisode;
    }
    private get zoomlineRangeStart(): number {
        return this.audioWindow.start.seconds;
    }
    private get zoomlineRangeEnd(): number {
        const seconds: number = this.audioWindow.start.seconds + this.audioWindow.duration;
        return Math.min(seconds, this.audio.duration);
    }
    private get zoomlineMarkCount(): number {
        return store.state.play.audioWindow.timeslotCount + 1;
    }

    // Internal Data members
    private get audioElement(): HTMLAudioElement {
        return this.$refs["audio-element"] as HTMLAudioElement;
    }
    private audioPlayTimeIntervalId: number = -1;
    private activeAppMode: ActiveAppMode = ActiveAppMode.StandardScreen;

    // Public API
    public beforeCreate(): void {
        this.$markRecomputable("audioElement");
    }
    public mounted(): void {
        this.onWindowResized();
        store.commit.device.addOnAppModeChangedListener(this.onWindowResized.bind(this));
        // const playbackProgress: number = store.state.user.getPlaybackProgressForEpisode(this.activeEpisode.id).seconds;
        // store.commit.play.moveAudioPos(playbackProgress);
        this.$recompute("audioElement");
    }
    public beforeDestroy(): void {
        this.$destroyRecomputables();
    }
    public destroyed(): void {
        store.commit.device.removeOnAppModeChangedListener(this.onWindowResized.bind(this));
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
        this.$recompute("audioElement");
    }
    public pause(): void {
        this.audioElement.pause();
        clearInterval(this.audioPlayTimeIntervalId);
        this.$recompute("audioElement");
    }

    public toggleMute(): void {
        this.audioElement.muted = !this.audioElement.muted;
        this.$recompute("audioElement");
    }

    // Private API
    private isTimelineWindowSynced(): boolean {
        const start: number = this.audioWindow.start.seconds;
        return this.audioPos.seconds >= this.audioWindow.start.seconds &&
            this.audioPos.seconds <= start + this.audioWindow.duration;
    }
    private updateAudioPos(): void {
        const wasInSync: boolean = this.isTimelineWindowSynced();
        store.commit.play.moveAudioPos(this.audioElement.currentTime);
        const isInSync: boolean = this.isTimelineWindowSynced();
        if (wasInSync && !isInSync) {
            const newWindowPos = this.audioWindow.start.seconds + this.audioWindow.duration;
            store.commit.play.moveAudioWindow(newWindowPos);
        }

        if (this.audioPos.seconds >= this.audio.duration) {
            this.pause();
        }
    }
    private onZoomlinePositionMoved(newValue: number): void {
        store.commit.play.seekTo(newValue);
        this.audioElement.currentTime = newValue;
    }
    private onTimelineWindowMoved(newValue: number): void {
        store.commit.play.moveAudioWindow(newValue);
    }

    private onWindowResized(): void {
        console.log("window resized!");
    }
};

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

.controls {
    background: rgb(37, 37, 37);
}

// .annotations {
// }

.timeline {
    height: 80px;
    width: 100%;
}
.agenda {
    height: 100px;
    flex: 0 30%;
    max-width: 30% // otherwise too long agenda items make this go not where intended
}

// https://blog.francium.tech/responsive-web-design-device-resolution-and-viewport-width-e7b7f138d7b9
// @media screen and (max-width: 1200px) {
//     .timeline-and-annotations {
//         flex: 0 100%;
//         order: 2;
//     }
//     .agenda {
//         flex: 0 100%;
//         order: 1;
//         max-width: 100%
//     }
// }

.zoomline {
    height: 40px;
}

.audio-element {
    display: none;
}

.slider-controls {
    width: 100%;
}
</style>

<style lang="less">
@import "../../cssresources/theme.less";

.current-play-position {
    position: relative;
    top: -100%;
    height: 100%;
    width: 0.5%;
    min-width: 3px;
    background: @theme-focus-color-4;
    transition: @player-transition-time;
}

</style>
