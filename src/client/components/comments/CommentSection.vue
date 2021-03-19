<template>
    <!-- relative position because of the v-overlay - see this:
    https://stackoverflow.com/questions/62089501/how-to-have-an-absolute-v-overlay-boxed-inside-a-v-col -->
    <div class="comment-section-root" style="position: relative;">
        <div class="flex-container">
            <div class="new-thread-container">
                <template>
                    <v-text-field @focus=checkAndShowLoginDialog v-model=postContent id=newCommentTextField
                        autocomplete="off" label="Start a new thread at current time"/>
                    <v-btn @click=startNewCommentThread>Submit</v-btn>
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

        <!-- this is the dialog for deleting comments - here because it should be shared with all comments -->
        <template>
            <v-dialog v-model="showDeleteCommentDialog" max-width="400">
            <v-card>
                <v-card-title class="headline">
                Are you sure you want to delete this comment?
                </v-card-title>
                <v-card-actions>
                <v-btn text color="grey darken-1" @click="deleteComment(true)">
                    Yes
                </v-btn>
                <v-btn text color="grey darken-1" @click="deleteComment(false)">
                    No
                </v-btn>
                </v-card-actions>
            </v-card>
            </v-dialog>
        </template>

        <!-- this is the "loading comments for range" overlay for when the window moves on the timeline -->
        <v-overlay opacity="0.7" :absolute="true" :value="showLoadingCommentsOverlay" class="text-center">
            <h1>Loading comments for this range</h1>
            <v-progress-circular :size="70" :width="7" color="grey" indeterminate/>
        </v-overlay>
    </div>
</template>

<script lang="ts">

import { Component, Watch, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as Comment } from "@/logic/entities/Comments";
import { debounce } from "lodash";

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
        return store.state.play.allThreads;
    }
    public get audioWindow(): AudioWindow {
        return store.state.play.audioWindow;
    }
    public get audioPos(): Timepoint {
        return store.state.play.audioPos;
    }

    // ================================================================
    // == deleting comments
    // ================================================================

    get showDeleteCommentDialog(): boolean {
        return store.state.play.commentToDelete !== undefined;
    }
    set showDeleteCommentDialog(newVal: boolean) {
        store.commit.play.setCommentToDelete(undefined);
    }
    deleteComment(shouldDelete: boolean): void {
        if (shouldDelete) {
            store.dispatch.play.deleteComment(store.state.play.commentToDelete!);
        }
        store.commit.play.setCommentToDelete(undefined);
    }

    // ================================================================
    // == debounced loading of comments
    // ================================================================

    static deepCopyAudioWindow(aw: AudioWindow): AudioWindow {
        // TODO: fix this code-smell - there should be a better way!
        // this needs to be a deep full copy because otherwise the reactivity of Vue would kick in and updates to the start
        // of the window will trigger updaring of the comment section and that would defeat the purpose of the debouncing
        return new AudioWindow(aw.audioFile, new Timepoint(aw.start.seconds), aw.duration, aw.timeslotCount);
    }

    debouncedAudioWindow = CommentSection.deepCopyAudioWindow(this.audioWindow);
    showLoadingCommentsOverlay = false;

    stopLoadingComments(): void {
        if (this.showLoadingCommentsOverlay) {
            this.debouncedAudioWindow = CommentSection.deepCopyAudioWindow(this.audioWindow);
        }
        this.showLoadingCommentsOverlay = false;
    }

    debouncedStopLoadingComments = debounce(this.stopLoadingComments, 700) // we don't want to call this very often

    // TODO: deep watching is slow!!! can we use mapState to avoid the x.y.z nesting when accessing the state?
    @Watch("audioWindow", { deep: true })
    private watchSomething() {
        this.showLoadingCommentsOverlay = true;
        this.debouncedStopLoadingComments();
    }

    // ================================================================
    // == post new comment
    // ================================================================

    private postContent: string = "";

    private startNewCommentThread(): void {
        if (this.checkAndShowLoginDialog()) {
            if (this.postContent) {
                const payload = { commentToReplyTo: undefined, content: this.postContent };
                store.dispatch.play.postComment(payload);
                this.postContent = "";
            }
        }
    }

    // TODO: how to reuse this code with other components?
    checkAndShowLoginDialog(): boolean {
        if (store.state.user.info.isGuest) {
            // first unfocus (otherwise one would have to "escape" twice)
            (document.getElementById("newCommentTextField") as HTMLElement).blur();
            // and then on the next rendering frame show the login dialog - otherwise the unfocus wouldn't work
            this.$nextTick(() => {
                store.commit.user.setShowLoginDialog(true);
            });
            return false;
        }
        return true;
    }

    // ================================================================
    // == comment display
    // ================================================================

    public get activeTimeslots(): Timeslot[] {
        const visibleThreads = this.commentThreads.filter(thread => this.debouncedAudioWindow.containsTimepoint(thread.start));
        const timeslotDuration = this.debouncedAudioWindow.timeslotDuration;
        const firstTimeslotStart = this.debouncedAudioWindow.start.seconds;

        const mapSlotTimeToThreads = (time: number) => {
            return visibleThreads.filter(thread => MathHelpers.isBetweenOpenEnded(thread.start.seconds, time, time + timeslotDuration));
        };
        const timeslots: Timeslot[] = [];
        for (let i = 0; i < this.debouncedAudioWindow.timeslotCount; i++) {
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
        root.style.setProperty("--number-of-timeslots", store.state.play.audioWindow.timeslotCount.toString());
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
        const slotEnd: number = slotStart + this.debouncedAudioWindow.timeslotDuration;
        const percentage: number = MathHelpers.percentageOfRange(now, slotStart, slotEnd);
        const rampTime: number = 0.1;
        return {
            "timeslot-active-ramp-up": MathHelpers.isBetween(percentage, -rampTime/2, rampTime),
            "timeslot-active-steady": MathHelpers.isBetween(percentage, rampTime, 1-rampTime),
            "timeslot-active-ramp-down": MathHelpers.isBetween(percentage, 1-rampTime, 1+rampTime/2)
        };
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
            return rhs.date_added.valueOf() - lhs.date_added.valueOf();
        case SortingPredicate.Hot: // fall through, no hot yet
        case SortingPredicate.Top:
        default:
            return rhs.totalVotes - lhs.totalVotes;
            // return lhs.start.seconds - rhs.start.seconds; // this is chronological sorting
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
