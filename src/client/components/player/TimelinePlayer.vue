<template>
    <div class="timeline-player">
        <!-- controls=0 -->
        <!-- the controls for youtube are useful to see the progress bar and the buffering -->
        <!-- TODO: maybe integrate &origin=unpinch.io as parameter -->
        <iframe
            v-if=isYouTube
            width="100%"
            height="500px"
            id="player_iframe"
            :src="`https://www.youtube.com/embed/${activeEpisode.external_id}?enablejsapi=1&modestbranding=0&rel=0`"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
        />
        <div class="controls">
            <div class="slider-controls">
                <v-btn @click=togglePlay>
                    <v-icon v-if=isPaused>mdi-play</v-icon>
                    <v-icon v-else>mdi-pause</v-icon>
                </v-btn>
                <v-btn class="mute-button" @click=toggleMute>
                    <v-icon v-if="!isMuted && volume > 50">mdi-volume-high</v-icon>
                    <v-icon v-if="!isMuted && volume <= 50 && volume > 0">mdi-volume-medium</v-icon>
                    <v-icon v-if="isMuted || volume === 0">mdi-volume-off</v-icon>
                </v-btn>
                <!-- commented out for now - takes too much space and isn't useful for now -->
                <v-slider class="d-inline-block" style="width: 150px;"
                    :min=0 :max=100 :step=1 v-model=volume
                    label="Volume" thumb-label="always">
                </v-slider>
                <v-slider class="d-inline-block" style="width: 250px;"
                    :max=audio.duration
                    min=1
                    label="Window Size"
                    thumb-label="always"
                    thumb-size="40"
                    v-model=windowDuration>
                    <template v-slot:thumb-label="item">
                        {{formatWindowDuration(item.value)}}
                    </template>
                </v-slider>
                <!-- ALTERNATIVE POSITIONING OF THE LABEL: -->
                <!--
                <v-card flat color="transparent" class="d-inline-block">
                    <v-subheader>Window Size</v-subheader>
                    <v-card-text class="pt-0">
                        <v-slider class="d-inline-block" style="width: 150px;"
                            :max=audio.duration
                            min=1
                            thumb-label="always"
                            thumb-size="40"
                            v-model=windowDuration>
                            <template v-slot:thumb-label="item">
                                {{formatWindowDuration(item.value)}}
                            </template>
                        </v-slider>
                    </v-card-text>
                </v-card>
                -->
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

                <!-- TODO: use tooltips instead of title attribute - https://vuetifyjs.com/en/components/tooltips/ -->
                <v-btn :title="isZoomline ? 'Pinch' : 'Unpinch'" @click="isZoomline = !isZoomline" width="50px">
                    {{ isZoomline ? '►◄' : '◄►' }}
                </v-btn>

                <!-- TODO: use button-groups - mutually-exclusive toggles -->
                <v-btn title="comment histogram - where have others commented"><v-icon>mdi-comment-text-multiple-outline</v-icon></v-btn>
                <v-btn title="bookmark histogram - your bookmarks"><v-icon>mdi-bookmark-multiple-outline</v-icon></v-btn>

                <AgendaComponent
                    class="agenda"
                    :currentAudioPosition=audioPos
                    :agenda=activeEpisode.agenda
                    :audioWindow=audioWindow
                >
                </AgendaComponent>

                <audio nocontrols
                    v-if=!isYouTube
                    class="d-none"
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
        <!-- <Funnel
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
        </Zoomline> -->
    </div>
</template>

<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";

import { default as Annotations } from "./Annotations.vue";
import { default as Timeline } from "./Timeline.vue";
// import { default as Funnel } from "./Funnel.vue";
// import { default as Zoomline } from "./Zoomline.vue";
import AgendaComponent from "./Agenda.vue";
import { Episode } from "@/logic/entities/Episode";
import CommonParams from "@/logic/CommonParams";

declare global {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onYouTubeIframeAPIReady: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        YT: any;
    }
}

window.onYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady || {};
window.YT = window.YT || {};

@Component({
    components: {
        Annotations,
        Timeline,
        // Funnel,
        // Zoomline,
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
    public get activeEpisode(): Episode {
        return store.state.play.activeEpisode;
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
    formatWindowDuration(input: number): string {
        return (new Timepoint(input)).format();
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
    // TODO: perhaps use the callback we've given to setInterval?
    @Watch("audioWindow", { deep: true })
    private watchAudioWindow() {
        this.windowStartAsString = Timepoint.FullFormat(this.windowStart);
        this.windowEndAsString = Timepoint.FullFormat(this.windowEnd);
    }

    isZoomline = false;

    private get zoomlineRangeStart(): number {
        return this.audioWindow.start.seconds;
    }
    private get zoomlineRangeEnd(): number {
        const seconds: number = this.audioWindow.start.seconds + this.audioWindow.duration;
        return Math.min(seconds, this.audio.duration);
    }

    // ================================================================
    // == YouTube iframe API
    // ================================================================

    get isYouTube() {
        return this.activeEpisode.external_source === CommonParams.EXTERNAL_SOURCE_YOUTUBE;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    youtube_player: any;
    youtube_player_state = 0;

    get isYouTubePlayerPlaying() {
        return this.youtube_player_state === 1 || this.youtube_player_state === 3;
    }

    initYouTubePlayer() {
        // TODO: figure out how to add this script properly to the website
        // also look for inspiration here: https://github.com/feross/yt-player
        const tag = document.createElement("script");
        tag.id = "iframe-demo";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

        // the youtube script expects such a function to exist and calls it when ready
        window.onYouTubeIframeAPIReady = () => {
            this.youtube_player = new window.YT.Player("player_iframe", {
                events: {
                    onReady: this.onPlayerReady,
                    onStateChange: this.onPlayerStateChange
                }
            });
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPlayerReady(_event: any) {
        this.youtube_player.setVolume(this.volume);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPlayerStateChange(event: any) {
        this.youtube_player_state = event.data;
        if (this.isYouTubePlayerPlaying) {
            this.play();
        }
        // https://developers.google.com/youtube/iframe_api_reference#Events
        // console.log("== onPlayerStateChange " + event.data);
    }

    // ================================================================
    // == playback controls
    // ================================================================

    get isPaused(): boolean {
        return !this.isYouTubePlayerPlaying;
    }

    togglePlay() {
        this.isPaused ? this.play() : this.pause();
    }
    play() {
        if (this.youtube_player) {
            this.youtube_player.playVideo();
        }
    }
    pause() {
        this.youtube_player.pauseVideo();
    }

    private isTimelineWindowSynced(): boolean {
        const start: number = this.audioWindow.start.seconds;
        return this.audioPos.seconds >= this.audioWindow.start.seconds &&
            this.audioPos.seconds <= start + this.audioWindow.duration;
    }

    youtubePlayerTimeLast = 0;
    syncPlayersIntervalId = window.setInterval(() => this.syncPlayers(), 16);

    syncPlayers() {
        if (!this.youtube_player || !this.isYouTubePlayerPlaying) {
            return;
        }

        // first update the volume-related controls if they have changed
        // in the youtube player since there are no event listeners
        const vol = this.youtube_player.getVolume();
        if (vol !== this.volume) {
            this.volume = vol;
        }
        if (this.isMuted !== this.youtube_player.isMuted()) {
            this.isMuted = this.youtube_player.isMuted();
        }

        let justSyncedPlayerAndVuex = false;
        const youtubePlayerTime = this.youtube_player.getCurrentTime();

        // if there's divergence between youtube and vuex bigger than 1 second
        if (Math.abs(youtubePlayerTime - this.audioPos.seconds) > 1) {
            // if youtube's player has been moved (compared to it's previous position)
            if (Math.abs(youtubePlayerTime - this.youtubePlayerTimeLast) > 1) {
                // then update vuex and also reposition the window if need be
                store.commit.play.seekTo(youtubePlayerTime);
            } else {
                // otherwise update the youtube player because vuex's value has been changed
                // TODO: look into allowSeekAhead (true/false) while dragging over the timeline
                // https://developers.google.com/youtube/iframe_api_reference#seekTo
                this.youtube_player.seekTo(this.audioPos.seconds, true);
            }
            justSyncedPlayerAndVuex = true;
        }
        // cache the youtube player time for the next cycle
        this.youtubePlayerTimeLast = youtubePlayerTime;
        // do not continue with the logic if we've already done something
        if (justSyncedPlayerAndVuex) {
            return;
        }

        // if youtube and vuex are in sync (relatively - within less than 1 second)
        const wasInSync = this.isTimelineWindowSynced();
        // advance vuex based on youtube
        store.commit.play.moveAudioPos(youtubePlayerTime);
        // move the window forward if the cursor was within it but is no longer
        if (wasInSync && !this.isTimelineWindowSynced()) {
            const newWindowPos = this.audioWindow.start.seconds + this.audioWindow.duration;
            store.commit.play.moveAudioWindow(newWindowPos);
        }
        // pause the player if we've reached the end - not relevant for youtube
        if (this.audioPos.seconds >= this.audio.duration) {
            this.pause();
        }
    }
    private onZoomlinePositionMoved(newValue: number): void {
        store.commit.play.seekTo(newValue);
    }
    private onTimelineWindowMoved(newValue: number): void {
        store.commit.play.moveAudioWindow(newValue);
    }

    // ================================================================
    // == volume controls
    // ================================================================

    public get volume(): number {
        return store.state.play.volume;
    }
    public set volume(value: number) {
        store.commit.play.setVolume(value);
        if (this.isYouTube) {
            if (this.youtube_player && value !== this.youtube_player.getVolume()) {
                this.youtube_player.setVolume(value);
            }
        } else {
            // this.audioElement.volume = value;
        }
    }
    isMuted = false;
    public toggleMute(): void {
        if (this.isYouTube) {
            if (this.youtube_player) {
                if (this.isMuted) {
                    this.youtube_player.unMute();
                } else {
                    this.youtube_player.mute();
                }
            }
        } else {
            // this.audioElement.muted = !this.audioElement.muted;
            // this.$recompute("audioElement");
        }
        this.isMuted = !this.isMuted;
    }

    // ================================================================
    // == hooks
    // ================================================================

    beforeCreate() {
        if (!this.isYouTube) {
            // this.$markRecomputable("audioElement");
        }
    }

    created() {
        if (this.isYouTube) {
            this.initYouTubePlayer();
        }
    }

    mounted() {
        // const playbackProgress: number = store.state.user.getPlaybackProgressForEpisode(this.activeEpisode.id).seconds;
        // store.commit.play.moveAudioPos(playbackProgress);
        if (!this.isYouTube) {
            // this.$recompute("audioElement");
        }
    }

    beforeDestroy() {
        clearInterval(this.syncPlayersIntervalId);
        if (!this.isYouTube) {
            this.$destroyRecomputables();
        }
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

// .zoomline {
//     height: 40px;
// }

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
