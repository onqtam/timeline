<template>
    <div class="comment-section-root">
        <CommentThreadComponent
            v-for="thread in threadsInRange" :key="thread.id"
            :thread=thread
        />
    </div>
</template>

<script lang="ts">

import { Component, Vue, Prop } from "vue-property-decorator";
import { default as CommentThread } from "@/logic/Comments";

import CommentThreadComponent from "./CommentThread.vue";
import { AudioWindow } from "@/logic/AudioFile";

@Component({
    components: {
        CommentThreadComponent
    }
})
export default class CommentSection extends Vue {
    // Props
    public allThreads: CommentThread[];
    @Prop({ type: AudioWindow })
    public audioWindow!: AudioWindow;

    public get threadsInRange(): CommentThread[] {
        const THREADS_IN_VIEW = 5; // TODO: Move this to a better place
        return this.allThreads.filter(thread => this.audioWindow.containsTimepoint(thread.timepoint)).slice(0, THREADS_IN_VIEW);
    }

    constructor() {
        super();

        this.allThreads = [];
        const commentsPerThread = 2;
        const nestedness = 2;
        const secondsBetweenThreads = 15;
        const varianceBetweenSeconds = 5;
        const maxAudioDuration = 5403;
        const chanceForNested = 0.15;
        // Use this func to randomize comment sections
        const nextCommentThreadRand = (t: number) => t + (Math.random() - 0.5) * varianceBetweenSeconds + secondsBetweenThreads;
        // Use this func to always generate comments at numbers divisible by 12
        const nextCommentThread12 = (t: number) => t + 12;
        // Use this func to always generate comments divisible by 12, but sometimes skip some
        const nextCommentThread12Skip = (t: number) => t + 12 * [1, 1, 1, 2, 3][~~(Math.random() * 5)];
        console.log(nextCommentThreadRand, nextCommentThread12, nextCommentThread12Skip); // log all to silence warnings
        const nextCommentThread = nextCommentThread12;
        for (let i = nextCommentThread(0); i < maxAudioDuration; i = nextCommentThread(i)) {
            let newThread: CommentThread;
            if (Math.random() <= chanceForNested) {
                newThread = CommentThread.generateRandomThreadWithChildren(commentsPerThread, nestedness);
            } else {
                newThread = CommentThread.generateRandomThread(commentsPerThread);
            }
            newThread.timepoint.seconds = i;
            this.allThreads.push(newThread);
        }
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-section-root {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
}
.comment-thread-container { // Enhance the standard style of the comment-thread
    width: 18.5%; // 5 per row (almost 20%) but leave some negative space for margins
    max-height: 100%;
    overflow-y: auto;
}
</style>
