<template>
    <div>
        <TimelinePlayer ref="timeline-player" class="timeline-player" />
        <CommentSection ref="comment-section" />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import store from "@/client/store";

import Timepoint from "@/logic/entities/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import { default as Comment } from "@/logic/entities/Comments";

import VButton from "@/client/components/primitives/VButton.vue";
import TimelinePlayer from "@/client/components/TimelinePlayer.vue";
import CommentSection from "@/client/components/comments/CommentSection.vue";

@Component({
    components: {
        VButton,
        TimelinePlayer,
        CommentSection
    },
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<ListenView>) {
        // TODO: the code here duplicates part of the router and part of the onMounted code
        // as there's no other way
        // (or at least I couldn't find) to refresh the same component

        // There's no "afterRouteUpdate"... so we can't directly use the prop initialTimepoint
        // Fetch the timepoint from the query
        const timepointToSyncTo: Timepoint|null = Timepoint.tryParseFromURL(to.query.t as string);
        if (timepointToSyncTo) {
            (this.$refs["timeline-player"] as TimelinePlayer).seekTo(timepointToSyncTo.seconds);
        }
        if (to.query.thread) {
            const threadIdToFocus: number = ~~to.query.thread;
            this.$nextTick(() => {
                (this.$refs["comment-section"] as CommentSection).focusThread(threadIdToFocus!);
            });
        }

        next();
    }
})
export default class ListenView extends Vue {
    @Prop({ type: Timepoint })
    public initialTimepoint?: Timepoint;
    @Prop({ type: Number })
    public threadIdToFocus?: number;
    @Prop({ type: String })
    public podcastTitleURL!: string;
    @Prop({ type: String })
    public episodeTitleURL!: string;

    public get audioFile(): AudioFile {
        return store.state.listen.audioFile;
    }
    public get allThreads(): Comment[] {
        return store.state.listen.allThreads;
    }
    public get audioWindow(): AudioWindow {
        return store.state.listen.audioWindow;
    }
    public beforeMount(): void {
        console.assert(this.podcastTitleURL !== undefined && this.episodeTitleURL !== undefined);
        const episodeToPlay = store.state.podcast.findEpisode(this.podcastTitleURL, this.episodeTitleURL);

        if (!episodeToPlay) {
            console.error("No such episode exists!");
            return;
        }
        store.dispatch.listen.loadEpisode(episodeToPlay);
    }
    public mounted(): void {
        if (this.initialTimepoint) {
            store.commit.listen.moveAudioPos(this.initialTimepoint.seconds);
            const timeslotStart: number = this.audioWindow.findTimeslotStartForTime(this.initialTimepoint);
            store.commit.listen.moveAudioWindow(timeslotStart);
        }
        if (this.threadIdToFocus) {
            this.$nextTick(() => {
                (this.$refs["comment-section"] as CommentSection).focusThread(this.threadIdToFocus!);
            });
        }
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.timeline-player {
    height: 40vh;
}

.timeline-player, .comment-section-root {
    margin: 0 1em;
}

button {
    color: @theme-background;
}

.comment-section-root {
    // This limits the size of all threads; TODO revisit and pick a better number at a later stage
    height: 50vh;
    box-sizing: border-box;
    padding-bottom: 5vh;
}
</style>
