<template>
    <div class="comment-section-root">
        <div class="flex-container">
            <div class="new-thread-container">
                <template v-if="!isUserGuest">
                    <v-text-field ref="new-comment-thread-content" label="Start a new thread at current time"></v-text-field>
                    <v-btn @click=startNewCommentThread>Submit</v-btn>
                </template>
                <template v-else>
                    <label>You need to be logged in to write or vote on comments!</label>
                </template>
            </div>
            <v-btn-toggle
                mandatory
                v-model="sortingPredicate"
                class="comment-management-panel"
            >
                <v-btn :value=SortingPredicate.Top>
                    Top
                </v-btn>
                <v-btn :value=SortingPredicate.New>
                    New
                </v-btn>
                <!-- TODO: why can't I make this alert work ?!?!?!     https://codesandbox.io/s/rough-resonance-z19kd?file=/src/App.vue -->
                <v-btn :value=SortingPredicate.Hot @click="console.alert('not implemented!')">
                    Hot
                </v-btn>
            </v-btn-toggle>
        </div>
        <div class="flex-container">
            <div class="timeslot"
                v-for="(slot, index) in activeTimeslots" :key="slot.timepoint.seconds"
                :class=getTimeslotAnimationClass(slot)
            >
                <template v-if="slot.threads.length !== 0">
                    <CommentThreadComponent
                        v-for="thread in slot.threads" :key="thread.id"
                        :thread=thread
                        :timeslotIndex=index
                        :class="{ 'focused-thread': focusedThreadId === thread.id }"
                    />
                </template>
                <template v-else>
                    <p>Be the first to contribute in this range!</p>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts">

import { Component, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as Comment } from "@/logic/entities/Comments";

import { AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";
import MathHelpers from "@/logic/MathHelpers";

import CommentThreadComponent from "./CommentThread.vue";

class Timeslot {
    public timepoint!: Timepoint;
    public threads!: Comment[];
}

enum SortingPredicate {
    Top,
    New,
    Hot
}

@Component({
    components: {
        CommentThreadComponent
    }
})
export default class CommentSection extends Vue {
    // Props
    public get commentThreads(): Comment[] {
        return store.state.listen.allThreads;
    }
    public get audioWindow(): AudioWindow {
        return store.state.listen.audioWindow;
    }
    public get audioPos(): Timepoint {
        return store.state.listen.audioPos;
    }
    public get isUserGuest(): boolean {
        return store.state.user.info.isGuest;
    }

    public get activeTimeslots(): Timeslot[] {
        const visibleThreads = this.commentThreads.filter(thread => this.audioWindow.containsTimepoint(thread.timepoint));
        const timeslotDuration = this.audioWindow.timeslotDuration;
        const firstTimeslotStart = this.audioWindow.start.seconds;

        const mapSlotTimeToThreads = (time: number) => {
            return visibleThreads.filter(thread => MathHelpers.isBetweenOpenEnded(thread.timepoint.seconds, time, time + timeslotDuration));
        };
        const timeslots: Timeslot[] = [];
        for (let i = 0; i < this.audioWindow.timeslotCount; i++) {
            const newTimeslot: Timeslot = new Timeslot();
            newTimeslot.timepoint = new Timepoint(firstTimeslotStart + i * timeslotDuration);
            newTimeslot.threads = mapSlotTimeToThreads(newTimeslot.timepoint.seconds);
            timeslots.push(newTimeslot);
            newTimeslot.threads.sort(this.compareCommentThreads.bind(this));
        }
        return timeslots;
    }

    public focusedThreadId: number = -1;

    private SortingPredicate = SortingPredicate;
    private sortingPredicate: SortingPredicate = SortingPredicate.New;

    public mounted(): void {
        // Update the number of timeslots CSS var every time we are mounted to make sure it never goes out of sync
        const root: HTMLElement = document.documentElement;
        root.style.setProperty("--number-of-timeslots", store.state.listen.audioWindow.timeslotCount.toString());
    }

    public focusThread(threadId: number): void {
        const thread: Comment|undefined = this.commentThreads.find(thread => thread.id === threadId);
        // TODO: Report error in a meaningful way
        // Assert the thread exists and is in an active timeslot
        console.assert(thread !== undefined);
        const isInActiveSlot: boolean = this.activeTimeslots.find(slot => slot.threads.indexOf(thread!) !== -1) !== undefined;

        const threadElement: HTMLElement|null = document.getElementById(threadId.toString());
        if (threadElement && isInActiveSlot) {
            this.focusedThreadId = threadId;
            threadElement.scrollIntoView();
        }
    }

    private getTimeslotAnimationClass(timeslot: Timeslot): Record<string, boolean> {
        const now: number = this.audioPos.seconds;
        const slotStart: number = timeslot.timepoint.seconds;
        const slotEnd: number = slotStart + this.audioWindow.timeslotDuration;
        const percentage: number = MathHelpers.percentageOfRange(now, slotStart, slotEnd);
        const rampTime: number = 0.1;
        return {
            "timeslot-active-ramp-up": MathHelpers.isBetween(percentage, -rampTime/2, rampTime),
            "timeslot-active-steady": MathHelpers.isBetween(percentage, rampTime, 1-rampTime),
            "timeslot-active-ramp-down": MathHelpers.isBetween(percentage, 1-rampTime, 1+rampTime/2)
        };
    }

    private startNewCommentThread(): void {
        const inputElement = this.$refs["new-comment-thread-content"] as HTMLInputElement;
        store.dispatch.listen.postComment({ commentToReplyTo: undefined, content: inputElement.value });
    }

    private setSortingPredicate(predicate: SortingPredicate): void {
        if (predicate === SortingPredicate.Hot) {
            alert("Not implemented yet!");
        } else {
            this.sortingPredicate = predicate;
        }
    }

    private isSortingPredicateActive(predicate: SortingPredicate): boolean {
        return this.sortingPredicate === predicate;
    }

    private compareCommentThreads(lhs: Comment, rhs: Comment) {
        switch (this.sortingPredicate) {
        case SortingPredicate.New:
            return rhs.date.valueOf() - lhs.date.valueOf();
        case SortingPredicate.Hot: // fall through, no hot yet
        case SortingPredicate.Top:
        default:
            return rhs.totalVotes - lhs.totalVotes;
            // return lhs.timepoint.seconds - rhs.timepoint.seconds; // this is chronological sorting
        }
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

// .comment-section-root {
//     width: 1500px;
// }

.flex-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-evenly;
}
input, button {
    background: @theme-text-color;
    color: @theme-background;
}
.new-thread-container, .comment-management-panel {
    width: 48%;
    margin-bottom: 1em;
}

@top-row-shared-border: 2px solid @theme-focus-color-3;

.new-thread-container {
    border-right: @top-row-shared-border;
}
.comment-management-panel {
    border-left: @top-row-shared-border;
}
:root {
  --number-of-timeslots: 5;
}
.timeslot {
    width: calc(100% / var(--number-of-timeslots) - 1.5%); // distribute evenly but leave some negative space (1.5%) for margins
    max-height: 100%;
    overflow-y: auto;
    padding-right: 0.25em;
    // Scrollbar
    &::-webkit-scrollbar {
        width: 0.75em;
        border-radius: 10px;
        border: 1px solid @theme-text-color;
    }

    &::-webkit-scrollbar-track {
        border-radius: 10px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: @theme-neutral-color;
        border-radius: 10px;
    }

    // Activation animations
    outline: 0.5em double transparent;
    transition: outline-color 1s linear;

    &.timeslot-active-ramp-up {
        outline-color: fade(@theme-focus-color-4, 40%);
    }
    &.timeslot-active-steady {
        outline-color: @theme-focus-color-4;
    }
    &.timeslot-active-ramp-down {
        outline-color: fade(@theme-focus-color-4, 40%);
    }
}
.comment-thread-container {
    margin-bottom: 1em;
    transition: all 1s linear;
    transition-property: border-color, background-color;
}
.focused-thread {
    border-color: @theme-focus-color;
    background-color: fade(@theme-focus-color, 20%);
}
</style>
