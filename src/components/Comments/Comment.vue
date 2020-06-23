<template>
    <div class="comment-container">
        <!-- Show controls if we aren't the head of a thread; the thread owns the controls for it -->
        <CommentControlsComponent
            v-if=!isHead
            :comment=comment :isExpanded.sync=isExpanded :isCollapsible=true
        />
        <!-- Set the comment id as element id to be able to find comment's DOM element from other systems  -->
        <div class="comment-content" :id=comment.id>
            <span class="author">{{ comment.author }}</span>
            <span class="separator"> · </span>
            <span class="votes">
                {{ comment.totalVotes }} points
            </span>
            <span class="separator"> · </span>
            <span class="date">{{ formatCommentDate() }}</span>
            <span class="separator"> · </span>
            <!-- TODO Create a button component -->
            <a class="start-reply-button" @click=toggleIsReplyingTo>
                <i class="fa fa-reply" aria-hidden="true"></i> Reply
            </a>
            <div v-if=isReplyingTo>
                <br/>
                <input type="text" ref="reply-content">
                <a class="submit-reply-button" @click=submitReply>
                    <i class="fa fa-reply" aria-hidden="true"></i> Submit reply
                </a>
            </div>
            <p class="comment-section" v-if=isExpanded>
                {{ contentToDisplay }}
            </p>
        </div>
        <hr v-if=shouldShowDelimiter>
    </div>
</template>

<script lang="ts">

import { Component, Prop, Vue } from "vue-property-decorator";
import store from "@/store";
import { default as CommentThread, Comment, CommentPrimitive } from "@/logic/Comments";
import CommentControlsComponent from "./CommentControls.vue";

@Component({
    components: {
        CommentControlsComponent
    }
})
export default class CommentComponent extends Vue {
    // Props
    @Prop({ type: Comment })
    public readonly comment!: Comment;
    @Prop({ type: CommentThread })
    public readonly parentThread!: CommentThread;
    @Prop({ type: Boolean })
    public shouldShowOnlyPreview!: boolean;

    public get hasVotedUp(): boolean {
        return store.state.user.info.activity.getVoteOnComment(this.comment.id) === true;
    }
    public get hasVotedDown(): boolean {
        return store.state.user.info.activity.getVoteOnComment(this.comment.id) === false;
    }

    public get contentToDisplay(): string {
        const MAX_PREVIEW_CHAR_LIMIT = 47;
        if (this.shouldShowOnlyPreview && this.comment.content.length > MAX_PREVIEW_CHAR_LIMIT) {
            return this.comment.content.substr(0, MAX_PREVIEW_CHAR_LIMIT) + "...";
        }
        return this.comment.content;
    }

    private isExpanded: boolean = true;
    private isReplyingTo: boolean = false;

    private get isHead(): boolean {
        return this.parentThread.threadHead === this.comment;
    }

    private get shouldShowDelimiter(): boolean {
        const parentTail: CommentPrimitive[] = this.parentThread.threadTail;
        const isLast = this.comment === parentTail[parentTail.length - 1];
        return this.isExpanded && !isLast;
    }

    public mounted(): void {
        this.$emit("update:isExpanded", this.isExpanded);
    }

    private toggleIsReplyingTo(): void {
        this.isReplyingTo = !this.isReplyingTo;
    }

    private submitReply(): void {
        const postContent: string = (this.$refs["reply-content"] as HTMLInputElement).value;
        const payload = { parentThread: this.parentThread, commentToReplyTo: this.comment, content: postContent };
        store.commit.listen.postReply(payload);
    }

    private formatCommentDate(): string {
        const timeSinceComment = new Date().valueOf() - this.comment.date.valueOf();
        const MS_TO_SECONDS: number = 1/1000;
        const MS_TO_MINUTES: number = MS_TO_SECONDS / 60;
        const MS_TO_HOURS: number = MS_TO_MINUTES / 60;
        const MS_TO_DAYS: number = MS_TO_HOURS / 24;

        const days = timeSinceComment * MS_TO_DAYS;
        const hours = timeSinceComment * MS_TO_HOURS;
        const minutes = timeSinceComment * MS_TO_MINUTES;
        const seconds = timeSinceComment * MS_TO_SECONDS;

        // TODO: This code is incredibly basic and stupidly un-localizable
        let timePeriod: string;
        let value: number;
        if (days >= 7) {
            const dateFormatOptions = { day: "2-digit", month: "2-digit", year: "2-digit" };
            return this.comment.date.toLocaleDateString("en-GB", dateFormatOptions);
        } else if (days >= 1) {
            timePeriod = "day";
            value = days;
        } else if (hours >= 1) {
            timePeriod = "hour";
            value = hours;
        } else if (minutes >= 1) {
            timePeriod = "minute";
            value = minutes;
        } else {
            timePeriod = "second";
            value = seconds;
        }
        const isPlural: boolean = value !== 1;
        const pluralSuffix: string = isPlural ? "s" : "";
        return `${value.toFixed(0)} ${timePeriod}${pluralSuffix} ago`;
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";
@import "comments.less";

.comment-container {
    text-align: left;
    padding-left: @expansion-controls-offset;
    position: relative;
}
.votes, .date, .separator {
    color: @theme-neutral-color;
}
.start-reply-button, .submit-reply-button {
    font-weight: bold;
    cursor: pointer;

    &, & i {
        color: @theme-neutral-color;
    }
    &:hover, &:hover i {
        color: @theme-neutral-color-hover;
    }
}
input {
    color: @theme-background;
}
hr {
    margin-right: @expansion-controls-padding;
    background: @theme-neutral-color;
}

</style>
