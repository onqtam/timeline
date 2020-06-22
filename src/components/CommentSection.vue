<template>
    <div class="comment-section-root">
        <div class="new-thread-container">
            <label>Start a new thread at current time: </label>
            <input type="text" minlength="3" ref="new-comment-thread-content">
            <VButton @click=startNewCommentThread>Submit</VButton>
        </div>
        <div class="comment-management-panel">
            <VToggleButton
                :isActive=isSortingPredicateActive(SortingPredicate.Chronologically)
                @click=setSortingPredicate(SortingPredicate.Chronologically)
            >
                Chronologically
            </VToggleButton>
            <VToggleButton
                :isActive=isSortingPredicateActive(SortingPredicate.Top)
                @click=setSortingPredicate(SortingPredicate.Top)
            >
                Top
            </VToggleButton>
            <VToggleButton
                :isActive=isSortingPredicateActive(SortingPredicate.New)
                @click=setSortingPredicate(SortingPredicate.New)
            >
                New
            </VToggleButton>
            <VToggleButton
                :isActive=isSortingPredicateActive(SortingPredicate.Hot)
                @click=setSortingPredicate(SortingPredicate.Hot)
            >
                Hot
            </VToggleButton>
        </div>
        <div class="timeslot"
            v-for="(slot, index) in activeTimeslots" :key="slot.timepoint.seconds"
        >
            <template v-if="slot.threads.length !== 0">
                <CommentThreadComponent
                    v-for="thread in slot.threads" :key="thread.id"
                    :thread=thread
                    :timeslotIndex=index
                />
            </template>
            <template v-else>
                <p>Be the first to contribute in this range!</p>
            </template>
        </div>
    </div>
</template>

<script lang="ts">

import { Component, Vue } from "vue-property-decorator";
import store from "@/store";
import { default as CommentThread } from "@/logic/Comments";

import VButton from "./primitives/VButton.vue";
import VToggleButton from "./primitives/VToggleButton.vue";
import CommentThreadComponent from "./CommentThread.vue";
import { AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/Timepoint";
import MathHelpers from "@/logic/MathHelpers";

class Timeslot {
    public timepoint!: Timepoint;
    public threads!: CommentThread[];
}

enum SortingPredicate {
    Chronologically,
    Top,
    New,
    Hot
}

@Component({
    components: {
        VButton,
        VToggleButton,
        CommentThreadComponent
    }
})
export default class CommentSection extends Vue {
    // Props
    public get commentThreads(): CommentThread[] {
        return store.state.listen.allThreads;
    }
    public get audioWindow(): AudioWindow {
        return store.state.listen.audioWindow;
    }

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
            newTimeslot.threads.sort(this.compareCommentThreads.bind(this));
        }
        return timeslots;
    }

    private SortingPredicate = SortingPredicate;
    private sortingPredicate: SortingPredicate = SortingPredicate.Chronologically;

    public mounted(): void {
        // Update the number of timeslots CSS var every time we are mounted to make sure it never goes out of sync
        const root: HTMLElement = document.documentElement;
        root.style.setProperty("--number-of-timeslots", store.state.listen.audioWindow.timeslotCount.toString());
    }

    private startNewCommentThread(): void {
        const inputElement = this.$refs["new-comment-thread-content"] as HTMLInputElement;
        store.commit.listen.postNewCommentThread(inputElement.value);
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

    private compareCommentThreads(lhs: CommentThread, rhs: CommentThread) {
        switch (this.sortingPredicate) {
        case SortingPredicate.Top:
            return rhs.threadHead.totalVotes - lhs.threadHead.totalVotes;
        case SortingPredicate.New:
            return rhs.threadHead.date.valueOf() - lhs.threadHead.date.valueOf();
        case SortingPredicate.Chronologically:
        default: // fall through, no hot yet
            return lhs.timepoint.seconds - rhs.timepoint.seconds;
        }
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-section-root {
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
    box-sizing: border-box;
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
}
.comment-thread-container {
    margin-bottom: 1em;
}
</style>
