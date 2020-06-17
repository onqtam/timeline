<template>
    <div class="comment-section-root">
        <div class="timeslot"
            v-for="slot in activeTimeslots" :key="slot.timepoint.seconds"
        >
            <CommentThreadComponent
                v-for="thread in slot.threads" :key="thread.id"
                :thread=thread
            />
        </div>
    </div>
</template>

<script lang="ts">

import { Component, Vue, Prop } from "vue-property-decorator";
import { default as CommentThread } from "@/logic/Comments";

import CommentThreadComponent from "./CommentThread.vue";
import { AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/Timepoint";
import MathHelpers from "@/logic/MathHelpers";

class Timeslot {
    public timepoint!: Timepoint;
    public threads!: CommentThread[];
}

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

    public get activeTimeslots(): Timeslot[] {
        const visibleThreads = this.allThreads.filter(thread => this.audioWindow.containsTimepoint(thread.timepoint));
        const TIMESLOT_COUNT = 5; // TODO: Move this to a better place
        const timeslotDuration = this.audioWindow.duration / TIMESLOT_COUNT;
        const firstTimeslotStart = this.audioWindow.start.seconds;

        const mapSlotTimeToThreads = (time: number) => {
            return visibleThreads.filter(thread => MathHelpers.isBetween(thread.timepoint.seconds, time, time + timeslotDuration));
        };
        const timeslots: Timeslot[] = [];
        for (let i = 0; i < TIMESLOT_COUNT; i++) {
            const newTimeslot: Timeslot = new Timeslot();
            newTimeslot.timepoint = new Timepoint(firstTimeslotStart + i * timeslotDuration);
            newTimeslot.threads = mapSlotTimeToThreads(newTimeslot.timepoint.seconds);
            timeslots.push(newTimeslot);
        }
        return timeslots;
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
.timeslot {
    width: 18.5%; // 5 per row (almost 20%) but leave some negative space for margins
    max-height: 100%;
    overflow-y: auto;
}
</style>
