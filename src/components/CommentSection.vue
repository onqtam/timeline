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
    @Prop({ type: Array })
    public commentThreads!: CommentThread[];
    @Prop({ type: AudioWindow })
    public audioWindow!: AudioWindow;

    public get activeTimeslots(): Timeslot[] {
        const visibleThreads = this.commentThreads.filter(thread => this.audioWindow.containsTimepoint(thread.timepoint));
        const timeslotDuration = this.audioWindow.timeslotDuration;
        const firstTimeslotStart = this.audioWindow.start.seconds;

        const mapSlotTimeToThreads = (time: number) => {
            return visibleThreads.filter(thread => MathHelpers.isBetween(thread.timepoint.seconds, time, time + timeslotDuration));
        };
        const timeslots: Timeslot[] = [];
        for (let i = 0; i < this.audioWindow.timeslotCount; i++) {
            const newTimeslot: Timeslot = new Timeslot();
            newTimeslot.timepoint = new Timepoint(firstTimeslotStart + i * timeslotDuration);
            newTimeslot.threads = mapSlotTimeToThreads(newTimeslot.timepoint.seconds);
            timeslots.push(newTimeslot);
        }
        return timeslots;
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
