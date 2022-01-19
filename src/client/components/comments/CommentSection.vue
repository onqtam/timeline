<template>
    <v-container class="pa-0">
        <v-row no-gutters class="mt-3">
            <v-textarea
                filled
                auto-grow
                v-model=postContent
                id=newCommentTextField
                rows="1"
                class="mr-2"
                autocomplete="off"
                @focus=checkAndShowLoginDialog
                label="Submit a new comment at current time"
            />
            <v-btn x-large class="mr-5" @click=startNewCommentThread>Submit</v-btn>
            <v-select
                :items="['Top','New']"
                filled
                class="flex-grow-0"
                style="width: 6em"
                outlined
                v-model="sortBy"
                label="Sort by"
                item-value="1"
            />
        </v-row>

        <!-- relative position because of the v-overlay - see this:
        https://stackoverflow.com/questions/62089501/how-to-have-an-absolute-v-overlay-boxed-inside-a-v-col -->
        <div style="position: relative; padding: 5; margin: 0;">
            <!-- taken from here: https://codepen.io/Mert75/pen/YzqwdPo
            alternatives: https://stackoverflow.com/questions/2812770/ -->
            <v-row align="center" class="mt-n5 mx-0 grey--text">
                <v-divider/>
                    <span class="d-block pl-2 pr-2">
                        Showing {{visibleThreads.length}} top-level {{visibleThreads.length === 1 ? "comment" : "comments"}} in the current window
                    </span>
                <v-divider/>
            </v-row>
            <div class="mt-5 commentThreads">
                <template v-if="visibleThreads.length !== 0">
                    <CommentThreadComponent
                        v-for="thread in visibleThreads" :key="thread.id"
                        :thread=thread
                        :class="{ 'focused-thread': focusedThreadId === thread.id }"
                    />
                </template>
                <template v-if="visibleThreads.length === 0 && !showLoadingCommentsOverlay">
                    <h1 align="center" class="mt-7">
                        Be the first to comment in the
                        &#60; {{audioWindow.start.format()}} - {{audioWindow.end.format()}} &#62;
                        range!
                    </h1>
                </template>
            </div>
            <!-- this is the "loading comments for the <X-Y> range" overlay for when the window moves on the timeline -->
            <v-overlay absolute class="text-center align-start" opacity="0.8" :value="showLoadingCommentsOverlay">
                <h1 class="mt-15">
                    Loading comments for the
                    &#60; {{audioWindow.start.format()}} - {{audioWindow.end.format()}} &#62;
                    range...
                </h1>
                <v-progress-circular :size="70" :width="9" color="grey" indeterminate/>
            </v-overlay>
        </div>

        <!-- this is the dialog for deleting comments - here because it should be shared with all comments -->
        <template>
            <v-dialog v-model="showDeleteCommentDialog" max-width="400">
            <v-card>
                <v-card-title class="headline">
                    Are you sure you want to delete this comment?
                </v-card-title>
                <v-card-actions>
                    <v-btn text color="grey" @click="deleteComment(true)">Yes</v-btn>
                    <v-btn text color="grey" @click="deleteComment(false)">No</v-btn>
                </v-card-actions>
            </v-card>
            </v-dialog>
        </template>
    </v-container>
</template>

<script lang="ts">

import { Component, Vue } from "vue-property-decorator";
import store from "@/client/store";
import { default as Comment } from "@/logic/entities/Comments";

import { AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";
import User from "@/logic/entities/User";

import CommentThreadComponent from "./CommentThread.vue";

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
    public get showLoadingCommentsOverlay(): boolean {
        return store.state.play.showLoadingCommentsOverlay;
    }
    public get audioPos(): Timepoint {
        return store.state.play.audioPos;
    }

    sortBy = "Top";

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

    public get visibleThreads(): Comment[] {
        // hide threads that aren't in the current window and that are deleted and don't have any replies to them
        const visibleThreads = this.commentThreads.filter(thread => store.state.play.audioWindowDebounced.containsTimepoint(thread.start) && (thread.userId !== User.deletedUserId || thread.hasReplies));
        visibleThreads.sort(this.compareCommentThreads.bind(this));
        return visibleThreads;
    }

    public focusedThreadId: number = -1;

    public focusThread(threadId: number): void {
        const thread: Comment|undefined = this.commentThreads.find(thread => thread.id === threadId);
        // TODO: Report error in a meaningful way
        // Assert the thread exists and is visible
        console.assert(thread !== undefined);
        const isVisible: boolean = this.visibleThreads.indexOf(thread!) !== -1;

        const threadElement: HTMLElement|null = document.getElementById(threadId.toString());
        if (threadElement && isVisible) {
            this.focusedThreadId = threadId;
            threadElement.scrollIntoView();
        }
    }

    private compareCommentThreads(lhs: Comment, rhs: Comment) {
        switch (this.sortBy) {
        case "New":
            return rhs.date_added.valueOf() - lhs.date_added.valueOf();
        case "Top":
        default:
            return rhs.totalVotes - lhs.totalVotes;
            // return lhs.start.seconds - rhs.start.seconds; // this is chronological sorting
        }
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

@top-row-shared-border: 2px solid @theme-focus-color-3;

.commentThreads {
    max-height: 80vh;
    min-height: 40vh;
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

    &.commentThreads-active-ramp-up {
        outline-color: fade(@theme-focus-color-4, 40%);
    }
    &.commentThreads-active-steady {
        outline-color: @theme-focus-color-4;
    }
    &.commentThreads-active-ramp-down {
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
