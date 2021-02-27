<template>
    <div>
        <!-- controls=0 -->
        <iframe width="100%" height="500px" src="https://www.youtube.com/embed/nM9f0W2KD5s?" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen/>
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
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<PlayView>) {
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
    @Prop({ type: String })
    public channelTitleURL!: string;
    @Prop({ type: String })
    public episodeTitleURL!: string;

    public get allThreads(): Comment[] {
        return store.state.play.allThreads;
    }

    public isDataLoaded: boolean = false;

    private _localPlaybackStorageTimerId: number = -1;
    private _serverPlaybackStorageTimerId: number = -1;

    static updateBasedOnRoute(to: Route) {
        console.log("🚀 ~ file: Play.vue ~ line 58 ~ PlayView ~ updateBasedOnRoute ~ to", to)
        let initialTimepoint = Timepoint.tryParseFromURL(to.query.t as string);
        let start = Timepoint.tryParseFromURL(to.query.start as string);
        let end = Timepoint.tryParseFromURL(to.query.end as string);

        // check if there's a range specified for the window
        if (start && end) {
            
            console.log(store.state.play.audioWindow.start.seconds);

            store.commit.play.setAudioWindow({start: start.seconds, end: end.seconds});
            store.commit.play.moveAudioPos(start.seconds);
            console.log(store.state.play.audioWindow.start.seconds);
        } else if (initialTimepoint) {
            store.commit.play.seekTo(initialTimepoint.seconds);
        }
    }

    public beforeMount(): void {
        console.assert(this.channelTitleURL !== undefined && this.episodeTitleURL !== undefined);
        const dispatchPayload = { channelURL: this.channelTitleURL, episodeURL: this.episodeTitleURL };
        store.dispatch.channel
            .loadEpisodeData(dispatchPayload)
            .then(episode => {
                console.assert(episode, "No such episode exists!");
                store.dispatch.play.loadEpisode(episode!)
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
