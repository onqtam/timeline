<template>
    <div class="timeline-player">
        <div class="controls">
            <div class="slider-controls">
                <VButton class="play-button" @click=togglePlay>
                    <i v-if=isPaused class="fa fa-play" aria-hidden="true"></i>
                    <i v-if=!isPaused class="fa fa-pause" aria-hidden="true"></i>
                </VButton>
                <VButton class="mute-button" @click=toggleMute>
                    <i v-if="!isMuted && volume > 0.5" class="fa fa-volume-up" aria-hidden="true"></i>
                    <i v-if="!isMuted && volume <= 0.5 && volume > 0" class="fa fa-volume-down" aria-hidden="true"></i>
                    <i v-if="isMuted || volume === 0" class="fa fa-volume-off" aria-hidden="true"></i>
                </VButton>
                <VSlider class="volume-slider" :min=0 :max=1 :step=0.01 :value.sync=volume></VSlider>
                <audio nocontrols
                    class="audio-element"
                    ref="audio-element"
                    :src=audio.filepath
                >
                </audio>
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
        <!-- <svg id="funnel" viewBox="0 0 1000 20" preserveAspectRatio="none" height="1.5em" width="100%">
            <defs>
            <linearGradient id="light_grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:rgb(190,190,210);stop-opacity:1"/>
                <stop offset="100%" style="stop-color:rgb(235,235,255);stop-opacity:1"/>
            </linearGradient>
            <linearGradient id="darker_grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:rgb(150,150,175);stop-opacity:1"/>
                <stop offset="100%" style="stop-color:rgb(200,200,225);stop-opacity:1"/>
            </linearGradient>
            </defs>
            <path fill="url(#light_grad)" d="
            M 0 20 C 0 10 0 10 110 10
            C 200 10 200 10 200 0
            L 250 0
            C 250 10 250 10 630 10
            C 1000 10 1000 10 1000 20"/>
            <path fill="url(#darker_grad)" d="
            M 0 20 C 0 10 0 10 110 10
            C 200 10 200 10 200 0
            L 210 0
            C 210 13 210 13 150 13
            C 100 13 100 13 100 20
            "/>
            <g stroke="black" stroke-width="1.2" fill="transparent">
            <path d="M 0 20 C 0 10 0 10 110 10"/>
            <path d="M 110 10 C 200 10 200 10 200 0"/>
            <path d="M 200 0 L 250 0"/>
            <path d="M 250 0 C 250 10 250 10 630 10"/>
            <path d="M 630 10 C 1000 10 1000 10 1000 20"/>
            </g>
            <g stroke="black" stroke-width="1.2" fill="transparent">
            <path d="M 210 0 C 210 13 210 13 150 13" stroke-width="0.8"/>
            <path d="M 150 13 C 100 13 100 13 100 20" stroke-width="0.8"/>
            </g>
        </svg> -->

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
    public get volume(): number {
        return store.state.listen.volume;
    }
    public set volume(value: number) {
        store.commit.listen.setVolume(value);
        this.audioElement.volume = value;
    }
    public get isMuted(): boolean {
        return !this.audioElement || this.audioElement.muted;
    }
    public get audioPos(): Timepoint {
        return store.state.listen.audioPos;
    }
    public get isPaused(): boolean {
        return !this.audioElement || this.audioElement.paused;
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
    public beforeCreate(): void {
        this.$markRecomputable("audioElement");
    }
    public mounted(): void {
        this.onWindowResized();
        store.commit.device.addOnAppModeChangedListener(this.onWindowResized.bind(this));
        const playbackProgress: number = store.state.user.getPlaybackProgressForEpisode(this.activeEpisode.id).seconds;
        store.commit.listen.moveAudioPos(playbackProgress);
        this.$recompute("audioElement");
    }
    public beforeDestroy(): void {
        this.$destroyRecomputables();
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
            this.timelineMarkCount = 5;
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
.volume-slider {
    // TODO: This needs to go as it overrides the v-slider's display: flex
    // may be wrap the vslider with another div so that it's not possible to be overriden?
    display: inline-block;
    width: 75%;
}
</style>
