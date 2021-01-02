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
            :audioWindow=audioWindow
            :numberOfMarks=timelineMarkCount
            :rangeStart=0 :rangeEnd=audio.duration
            :currentAudioPosition=audioPos
            @update:audioWindowStart=onTimelineWindowMoved
        >
        </Timeline>

        <Funnel
            class="funnel"
            ref="funnel"
            :duration_full=audio.duration
            :rangeStart_full=zoomlineRangeStart :rangeEnd_full=zoomlineRangeEnd
            :currentAudioPosition_full=audioPos
            @update:currentAudioPosition=onZoomlinePositionMoved
        >
        </Funnel>

        <!-- <AgendaComponent
            class="agenda"
            v-if=activeEpisode
            :agenda=activeEpisode.agenda
        >
        </AgendaComponent> -->
        <Zoomline
            class="zoomline"
            ref="zoomline"
            :numberOfMarks=zoomlineMarkCount
            :rangeStart=zoomlineRangeStart :rangeEnd=zoomlineRangeEnd
            :currentAudioPosition=audioPos
            @update:currentAudioPosition=onZoomlinePositionMoved
        >
        </Zoomline>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";

import VButton from "../primitives/VButton.vue";
import VSlider from "../primitives/VSlider.vue";
import { default as Timeline } from "./Timeline.vue";
import { default as Zoomline } from "./Zoomline.vue";
import { default as Funnel } from "./Funnel.vue";
import AgendaComponent from "./Agenda.vue";
import { Episode } from "@/logic/entities/Episode";
import { ActiveAppMode } from "../../store/StoreDeviceInfoModule";

@Component({
    components: {
        VButton,
        VSlider,
        Timeline,
        Funnel,
        Zoomline,
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
        store.commit.device.removeOnAppModeChangedListener(this.onWindowResized.bind(this));
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

// h3 {
//   margin: 40px 0 0;
// }
// ul {
//   list-style-type: none;
//   padding: 0;
// }
// li {
//   display: inline-block;
//   margin: 0 10px;
// }
// a {
//   color: #42b983;
// }
button {
    color: @theme-background;
    background: @theme-text-color;
}

.controls {
    // grid-area: controls;
    height: 60px;
}
.timeline {
    // grid-area: timeline;
    height: 100px;
}
.agenda {
    // grid-area: agenda;
}
.zoomline {
    // grid-area: zoomline;
    height: 100px;
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
