<template>
    <div>
        <TimelinePlayer
            ref="timeline-player"
            class="timeline-player"
            :audio=audioFile :volume=0.15 :initialAudioPos=initialTimepoint
            :audioWindow=audioWindow
            @update:onAudioWindowMoved=onAudioWindowMoved
        />
        <CommentSection :audioWindow=audioWindow />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import TimelinePlayer from "@/components/TimelinePlayer.vue";
import CommentSection from "@/components/CommentSection.vue";
import { default as AudioFile, AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/Timepoint";

@Component({
    components: {
        TimelinePlayer,
        CommentSection
    },
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<PlayerView>) {
        // There's no "afterRouteUpdate"... so we can't directly use the prop initialTimepoint
        // Fetch the timepoint from the query
        const secondToSeekTo: number = ~~to.query.t;
        if (!isNaN(secondToSeekTo)) {
            (this.$refs["timeline-player"] as TimelinePlayer).syncTo(secondToSeekTo);
        }
        next();
    }
})
export default class PlayerView extends Vue {
    public audioFile!: AudioFile;
    public audioWindow: AudioWindow = new AudioWindow(new Timepoint(0), 60); // 1 minute
    @Prop({ type: Timepoint })
    public initialTimepoint?: Timepoint;

    constructor() {
        super();
        this.audioFile = new AudioFile();
        this.audioFile.filepath = "../assets/Making_Sense_206_Frum.mp3";
        this.audioFile.duration = 5403;
    }

    public onAudioWindowMoved(newStart: number): void {
        this.audioWindow.start.seconds = newStart;
    }
}
</script>

<style scoped lang="less">

.timeline-player, .comment-section-root {
    margin: 0 1em;
}

.comment-section-root {
    // This limits the size of all threads; TODO revisit and pick a better number at a later stage
    max-height: 50vh;
    box-sizing: border-box;
    padding-bottom: 5vh;
}
</style>
