<template>
    <div>
        <TimelinePlayer v-if=isDataLoaded ref="timeline-player" class="timeline-player"/>
        <CommentSection v-if=isDataLoaded ref="comment-section"/>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import store from "@/client/store";

import Timepoint from "@/logic/entities/Timepoint";
import { default as Comment } from "@/logic/entities/Comments";

import TimelinePlayer from "@/client/components/player/TimelinePlayer.vue";
import CommentSection from "@/client/components/comments/CommentSection.vue";

@Component({
    components: {
        TimelinePlayer,
        CommentSection
    },
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<PlayView>): void {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        PlayView.updateBasedOnRoute(to);

        if (to.query.thread) {
            const threadIdToFocus: number = ~~to.query.thread;
            this.$nextTick(() => {
                console.log("🚀 ~ beforeRouteUpdate to.query.thread");
                (this.$refs["comment-section"] as CommentSection).focusThread(threadIdToFocus!);
            });
        }

        next();
    }
})
export default class PlayView extends Vue {
    @Prop({ type: Number })
    public threadIdToFocus?: number;
    @Prop({ type: Number })
    public episodeIdURL!: number;

    public get allThreads(): Comment[] {
        return store.state.play.allThreads;
    }

    public isDataLoaded: boolean = false;

    private _localPlaybackStorageTimerId: number = -1;
    private _serverPlaybackStorageTimerId: number = -1;

    static updateBasedOnRoute(to: Route): void {
        const initialTimepoint = Timepoint.tryParseFromURL(to.query.t as string);
        const start = Timepoint.tryParseFromURL(to.query.start as string);
        const end = Timepoint.tryParseFromURL(to.query.end as string);

        // check if there's a range specified for the window
        if (start && end) {
            store.commit.play.setAudioWindow({ start: start.seconds, end: end.seconds });
            store.commit.play.moveAudioPos(start.seconds);
        } else if (initialTimepoint) {
            store.commit.play.seekTo(initialTimepoint.seconds);
        }
    }

    public beforeMount(): void {
        console.assert(this.episodeIdURL !== undefined);
        store.dispatch.channel
            .loadEpisodeData({ episodeId: this.episodeIdURL })
            .then(episode => {
                console.assert(episode, "No such episode exists!");
                store.dispatch.play.loadEpisode(episode!);
                // .then(() => {
                this.isDataLoaded = true;
                PlayView.updateBasedOnRoute(this.$route);
                // });
            });
    }
    public mounted(): void {
        console.log("🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀 ~ PLAY MOUNTED");
        this.$nextTick(() => {
            if (this.threadIdToFocus) {
                this.$nextTick(() => {
                    (this.$refs["comment-section"] as CommentSection).focusThread(this.threadIdToFocus!);
                });
            }
        });


        // Trigger timers for saving the progress
        // const localTimer: number = 5000;
        // const serverTimer: number = 60000;
        // this._localPlaybackStorageTimerId = window.setInterval(() => {
        //     const payload = {
        //         episodeId: store.state.play.activeEpisode.id,
        //         progress: store.state.play.audioPos
        //     };
        //     store.commit.user.localSavePlaybackProgress(payload);
        // }, localTimer);
        // this._serverPlaybackStorageTimerId = window.setInterval(() => {
        //     const payload = {
        //         episodeId: store.state.play.activeEpisode.id,
        //         progress: store.state.play.audioPos
        //     };
        //     store.dispatch.user.savePlaybackProgress(payload);
        // }, serverTimer);
    }

    public destroyed(): void {
        clearInterval(this._localPlaybackStorageTimerId);
        clearInterval(this._serverPlaybackStorageTimerId);
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.timeline-player, .comment-section-root {
    margin: 0 1em;
}

.comment-section-root {
    // This limits the size of all threads; TODO: revisit and pick a better number at a later stage
    height: 60vh;
    padding-bottom: 5vh;
}
</style>
