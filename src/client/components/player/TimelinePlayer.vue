<template>
    <div>
        <!-- in src: &controls=0 -->
        <!-- in allow: autoplay; -->
        <!-- the controls for youtube are useful to see the progress bar and the buffering -->
        <!-- TODO: maybe integrate &origin=unpinch.io as parameter -->
        <iframe
            v-if=isYouTube
            width="100%"
            height="500px"
            id="player_iframe"
            :src="`https://www.youtube.com/embed/${activeEpisode.external_id}?enablejsapi=1&modestbranding=0&rel=0`"
            frameborder="0"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
        />

        <!-- artificial vertical offset if this is just audio - to see the slider thumbs -->
        <br v-if=!isYouTube>
        <br v-if=!isYouTube>

        <div class="controls">
            <div style="width: 100%">
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
                    :min=10
                    label="Window Size"
                    thumb-label="always"
                    thumb-size="40"
                    v-model=windowDuration>
                    <template v-slot:thumb-label=item>
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
                    @change=windowStartChange
                ></v-text-field>
                <v-text-field label="Window End" class="d-inline-block" style="width: 80px;"
                    v-mask="'##:##:##'"
                    autocomplete="off"
                    v-model=windowEndAsString
                    @change=windowEndChange
                ></v-text-field>

                <!-- TODO: use tooltips instead of title attribute - https://vuetifyjs.com/en/components/tooltips/ -->
                <v-btn :title="isZoomline ? 'Pinch' : 'Unpinch'" @click=toggleZoomline width="50px">
                    {{ isZoomline ? '►◄' : '◄►' }}
                </v-btn>

                <!-- TODO: use button-groups - mutually-exclusive toggles -->
                <v-btn title="comment histogram - where have others commented"><v-icon>mdi-comment-text-multiple-outline</v-icon></v-btn>
                <v-btn title="bookmark histogram - your bookmarks"><v-icon>mdi-bookmark-multiple-outline</v-icon></v-btn>

                <AgendaComponent
                    class="agenda"
                    :audioPos=audioPos.seconds
                    :agenda=activeEpisode.agenda
                    :audioWindow=audioWindow
                    @update:animate=animateCursorAndWindow
                    @update:audioWindowSet=onTimelineWindowSet
                    @update:currentAudioPosition=onCursorPositionMoved
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
            ref="annotations"
            :audioPos=audioPos.seconds
            :agenda=activeEpisode.agenda
            :audioWindow=audioWindow
            @update:animate=animateCursorAndWindow
            @update:audioWindowSet=onTimelineWindowSet
            @update:currentAudioPosition=onCursorPositionMoved
        >
        </Annotations>
        <Timeline
            class="timeline"
            ref="timeline"
            :audioWindow=audioWindow
            :currentAudioPosition=audioPos
            :isZoomline=isZoomline
            :shouldAnimate=shouldAnimate
            @update:audioWindowStart=onTimelineWindowMoved
            @update:currentAudioPosition=onCursorPositionMoved
        >
        </Timeline>
    </div>
</template>

<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";

import { default as Annotations } from "./Annotations.vue";
import { default as Timeline } from "./Timeline.vue";
import AgendaComponent from "./Agenda.vue";
import { Episode } from "@/logic/entities/Episode";
import CommonParams from "@/logic/CommonParams";
import { debounce } from "lodash";

// for more info about this take a look at https://stackoverflow.com/a/12709880/3162383
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

const TIME_DIVERGENCE_BOUNDRY = 1;

@Component({
    components: {
        Annotations,
        Timeline,
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
    private get audioElement(): HTMLAudioElement {
        return this.$refs["audio-element"] as HTMLAudioElement;
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
        if (this.isTimelineWindowSynced) {
            // we want the cursor to remain in the same relative position in the window
            const ratio = (this.audioPos.seconds - this.windowStart) / this.windowDuration;
            const start = this.audioPos.seconds - value * ratio;
            const end = start + value;
            // offset the window forward or backward so that the duration fits if need be
            let offset = start < 0 ? start : 0;
            offset += end > this.audio.duration ? end - this.audio.duration : 0;
            store.commit.play.setAudioWindow({ start: start - offset, end: end - offset });
        } else {
            // if the cursor is not in the window - just expand the window from the end
            let backward_offset = 0;
            // offset the window backward so that the duration fits if need be
            if (this.windowStart + value > this.audio.duration) {
                backward_offset = this.windowStart + value - this.audio.duration;
            }
            store.commit.play.setAudioWindow({ start: this.windowStart - backward_offset, end: this.windowStart + value - backward_offset });
        }
    }
    formatWindowDuration(input: number): string {
        return (new Timepoint(input)).format();
    }

    windowStartAsString = Timepoint.FullFormat(this.windowStart);
    windowStartChange(): void {
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
    windowEndChange(): void {
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
    private watchAudioWindow(): void {
        this.windowStartAsString = Timepoint.FullFormat(this.windowStart);
        this.windowEndAsString = Timepoint.FullFormat(this.windowEnd);
    }

    isZoomline = false;
    toggleZoomline(): void {
        this.isZoomline = !this.isZoomline;
        this.animateCursorAndWindow();
    }

    // ================================================================
    // == YouTube iframe API
    // ================================================================

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    youtubePlayer: any;
    youtubeState = -1;

    get isYouTubeReady(): boolean { return this.youtubeState !== -1; }
    get isYouTubePlaying(): boolean { return this.youtubeState === 1 || this.youtubeState === 3; }
    get isYouTube(): boolean {
        return this.activeEpisode.external_source === CommonParams.EXTERNAL_SOURCE_YOUTUBE;
    }

    initYouTubePlayer(): void {
        console.log("== initYouTubePlayer");
        // TODO: figure out how to add this script properly to the website
        const tag = document.createElement("script");
        tag.id = "iframe-demo";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

        // the youtube script expects such a function to exist and calls it when ready
        window.onYouTubeIframeAPIReady = () => {
            console.log("== onYouTubeIframeAPIReady");
            this.youtubePlayer = new window.YT.Player("player_iframe", {
                events: {
                    onReady: this.onPlayerReady,
                    onStateChange: this.onPlayerStateChange
                }
            });
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPlayerReady(_event: any): void {
        console.log("== onPlayerReady");
        this.youtubeState = 0;
        this.youtubePlayer.setVolume(this.volume);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPlayerStateChange(event: any): void {
        console.log("== onPlayerStateChange " + event.data);
        this.youtubeState = event.data;
        if (this.youtubeState === 1) {
            this.play();
        }
        // https://developers.google.com/youtube/iframe_api_reference#Events
    }

    // ================================================================
    // == playback controls
    // ================================================================

    get isPaused(): boolean {
        if (this.isYouTube) {
            return !this.isYouTubePlaying;
        } else {
            return !this.audioElement || this.audioElement.paused;
        }
    }

    togglePlay(): void {
        this.isPaused ? this.play() : this.pause();
    }
    play(): void {
        if (this.isYouTube) {
            if (this.isYouTubeReady) {
                this.youtubePlayer.playVideo();
            }
        } else {
            this.audioElement.currentTime = this.audioPos.seconds;
            this.audioElement.volume = this.volume / 100;
            this.audioElement.play();
            this.$recompute("audioElement");
        }
    }
    pause(): void {
        if (this.isYouTube) {
            if (this.isYouTubeReady) {
                this.youtubePlayer.pauseVideo();
            }
        } else {
            this.audioElement.pause();
            this.$recompute("audioElement");
        }
    }

    private get isTimelineWindowSynced(): boolean {
        return this.audioPos.seconds >= this.windowStart &&
            this.audioPos.seconds <= this.windowStart + this.audioWindow.duration;
    }

    youtubePlayerTimeLast = 0;
    syncPlayersIntervalId = window.setInterval(() => this.isYouTube ? this.syncYoutube() : this.syncAudio(), 16);

    syncAudio(): void {
        // if there's divergence between the audio and vuex bigger than 1 second
        if (Math.abs(this.audioElement.currentTime - this.audioPos.seconds) > TIME_DIVERGENCE_BOUNDRY) {
            // update the audio pos because the vuex position has most probably been changed
            // because of a route change (different window/annotation or different time pos)
            this.audioElement.currentTime = this.audioPos.seconds;
        }
        this.syncCursorAndWindow(this.audioElement.currentTime);
        // this is necessary because `this.audioElement.paused` doesn't seem
        // reactive and `this.isPaused` doesn't properly change the play/pause icon
        if (this.audioElement.paused) {
            this.pause();
        }
    }

    syncCursorAndWindow(newCursorPos: number): void {
        // if youtube and vuex are in sync (relatively - within less than 1 second)
        const wasInSync = this.isTimelineWindowSynced;
        // advance vuex based on youtube - ONLY if we are not animating! otherwise the cursor
        // would be playing catch-up with the position it should be at during normal playback
        if (!this.shouldAnimate) {
            store.commit.play.moveAudioPos(newCursorPos);
        }
        // move the window forward if the cursor was within it but is no longer
        if (wasInSync && !this.isTimelineWindowSynced) {
            const newWindowPos = this.audioWindow.start.seconds + this.audioWindow.duration;
            store.commit.play.moveAudioWindow(newWindowPos);
            this.animateCursorAndWindow();
        }
    }

    shouldAnimate = false;
    stopAnimating(): void {
        // console.log("== stop animating")
        this.shouldAnimate = false;
    }
    debouncedStopAnimating = debounce(this.stopAnimating, 400); // == css transition duration
    animateCursorAndWindow(): void {
        // console.log("== animate!")
        this.shouldAnimate = true;
        this.debouncedStopAnimating();
    }

    syncYoutube(): void {
        if (!this.isYouTubeReady) {
            return;
        }

        // first update the volume-related controls if they have changed
        // in the youtube player since there are no event listeners
        const vol = this.youtubePlayer.getVolume();
        if (vol !== this.volume) {
            this.volume = vol;
        }
        if (this.isMuted !== this.youtubePlayer.isMuted()) {
            this.isMuted = this.youtubePlayer.isMuted();
        }

        let justSyncedPlayerAndVuex = false;
        const youtubePlayerTime = this.youtubePlayer.getCurrentTime();

        // if there's divergence between youtube and vuex bigger than 1 second
        if (Math.abs(youtubePlayerTime - this.audioPos.seconds) > TIME_DIVERGENCE_BOUNDRY) {
            // if youtube's player has been moved (compared to it's previous position)
            if (Math.abs(youtubePlayerTime - this.youtubePlayerTimeLast) > TIME_DIVERGENCE_BOUNDRY) {
                // then update vuex and also reposition the window if need be
                store.commit.play.seekTo(youtubePlayerTime);
            } else {
                // otherwise update the youtube player because vuex's value has been changed
                // TODO: look into allowSeekAhead (true/false) while dragging over the timeline
                // https://developers.google.com/youtube/iframe_api_reference#seekTo
                this.youtubePlayer.seekTo(this.audioPos.seconds, true);
            }
            justSyncedPlayerAndVuex = true;
        }
        // cache the youtube player time for the next cycle
        this.youtubePlayerTimeLast = youtubePlayerTime;
        // just return if we've already done something as we've handled all cases
        if (justSyncedPlayerAndVuex) {
            return;
        }
        // in case of no divergence between youtube and vuex - update the audio pos & window
        this.syncCursorAndWindow(youtubePlayerTime);
    }
    private onCursorPositionMoved(newValue: number): void {
        store.commit.play.seekTo(newValue);
        if (!this.isYouTube) {
            this.audioElement.currentTime = newValue;
        }
    }
    private onTimelineWindowMoved(newValue: number): void {
        store.commit.play.moveAudioWindow(newValue);
    }
    private onTimelineWindowSet(payload: { start: number; end: number }): void {
        store.commit.play.setAudioWindow(payload);
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
            if (this.isYouTubeReady && value !== this.youtubePlayer.getVolume()) {
                this.youtubePlayer.setVolume(value);
            }
        } else {
            this.audioElement.volume = value / 100;
        }
    }
    isMuted = false;
    public toggleMute(): void {
        if (this.isYouTube) {
            if (this.isYouTubeReady) {
                if (this.isMuted) {
                    this.youtubePlayer.unMute();
                } else {
                    this.youtubePlayer.mute();
                }
            }
        } else {
            this.audioElement.muted = !this.audioElement.muted;
            this.$recompute("audioElement");
        }
        this.isMuted = !this.isMuted;
    }

    // ================================================================
    // == hooks
    // ================================================================

    beforeCreate(): void {
        if (!this.isYouTube) {
            this.$markRecomputable("audioElement");
        }
    }

    created(): void {
        if (this.isYouTube) {
            this.initYouTubePlayer();
        }
    }

    mounted(): void {
        // const playbackProgress: number = store.state.user.getPlaybackProgressForEpisode(this.activeEpisode.id).seconds;
        // store.commit.play.moveAudioPos(playbackProgress);
        if (!this.isYouTube) {
            this.$recompute("audioElement");
        }
    }

    beforeDestroy(): void {
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

</style>
