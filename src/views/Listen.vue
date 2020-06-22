<template>
    <div>
        <VButton @click=regenerateComments>
            Regenerate Comments
        </VButton>
        <TimelinePlayer
            ref="timeline-player"
            class="timeline-player"
            :initialAudioPos=initialTimepoint
        />
        <CommentSection />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import store from "@/store";

import Timepoint from "@/logic/Timepoint";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import { default as CommentThread } from "@/logic/Comments";

import VButton from "@/components/primitives/VButton.vue";
import TimelinePlayer from "@/components/TimelinePlayer.vue";
import CommentSection from "@/components/CommentSection.vue";

@Component({
    components: {
        VButton,
        TimelinePlayer,
        CommentSection
    },
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<ListenView>) {
        // There's no "afterRouteUpdate"... so we can't directly use the prop initialTimepoint
        // Fetch the timepoint from the query
        const timepointToSyncTo: Timepoint = Timepoint.parseFromURL(to.query.t as string);
        (this.$refs["timeline-player"] as TimelinePlayer).syncTo(timepointToSyncTo.seconds);
        next();
    }
})
export default class ListenView extends Vue {
    public get audioFile(): AudioFile {
        return store.state.listen.audioFile;
    }
    public get allThreads(): CommentThread[] {
        return store.state.listen.allThreads;
    }
    public audioWindow(): AudioWindow {
        return store.state.listen.audioWindow;
    }

    @Prop({ type: Timepoint })
    public initialTimepoint?: Timepoint;

    public regenerateComments(): void {
        store.commit.listen.regenerateComments();
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

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
