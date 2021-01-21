<template>
    <div class="timeline-player">
        <div class="controls">
            <div class="slider-controls">
                <v-btn class="play-button" @click=togglePlay>
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
                <v-slider class="volume-slider"
                    min=30 max=1200 step=1 label="Window Size" thumb-label="always"
                    v-model=audioWindowDuration>
                </v-slider>
                <v-text-field label="omg" style="display: inline-block;"></v-text-field>
                Window Start: {{audioWindow.start.format()}}
                <!-- <span style="display: inline-block; width: 70px;">{{audioWindow.start.format()}}</span> -->
                <!-- <span style="display: inline-block; width: 100px;">Window End: {{audioWindow.end.format()}}</span> -->


                <!-- TODO: use button-groups - mutually-exclusive toggles -->
                <!-- <v-btn>Comments</v-btn>
                <v-btn>Bookmarks</v-btn> -->
                <audio nocontrols
                    class="audio-element"
                    ref="audio-element"
                    :src=audio.filepath
                >
                </audio>
            </div>
        </div>
        <div style="display: flex; flex-wrap: wrap;">
            <div class="timeline-and-annotations">
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
                >
                </Timeline>
            </div>
            <AgendaComponent
                class="agenda"
                v-if=activeEpisode
                :agenda=activeEpisode.agenda
            >
            </AgendaComponent>
        </div>
        <Funnel
            class="funnel"
            ref="funnel"
            :duration_full=audio.duration
            :rangeStart_full=zoomlineRangeStart :rangeEnd_full=zoomlineRangeEnd
            :currentAudioPosition_full=audioPos
            :timelineWidthRatio=0.7
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
import { Component, Vue } from "vue-property-decorator";
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
    public get audioWindowDuration(): number {
        return store.state.user.info.settings.audioWindowDuration;
    }
    public set audioWindowDuration(value: number) {
        const payload = { key: "audioWindowDuration", value };
        store.commit.user.localSetSettingValue(payload);
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
        if (!this.audioWindow.containsTimepoint(secondToSeekTo)) {
            const timeslotStart: number = this.audioWindow.findTimeslotStartForTime(secondToSeekTo);
            console.log("🚀 ~ file: TimelinePlayer.vue ~ line 180 ~ TimelinePlayer ~ seekTo ~ timeslotStart", timeslotStart);
            store.commit.listen.moveAudioWindow(timeslotStart);
        }
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
        console.log("window resized!");
    }
};

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

button {
    color: @theme-background;
    background: @theme-text-color;
}

.controls {
    background: rgb(37, 37, 37);
}

// .annotations {
// }

.timeline-and-annotations {
    height: 100px;
    flex: 0 70%;
}
.timeline {
    height: 80px;
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

.play-button {
    margin: 0;
}
.slider-controls {
    width: 100%;
}
.volume-slider {
    // TODO: This needs to go as it overrides the v-slider's display: flex
    // may be wrap the v-slider with another div so that it's not possible to be overriden?
    display: inline-block;
    width: 200px;
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
