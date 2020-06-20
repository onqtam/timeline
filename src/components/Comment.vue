<template>
    <div class="comment-container">
        <div class="expanded-controls"
            v-if=isExpanded
        >
            <a class="vote-button"
                :class="{ 'active-vote': hasVotedUp }"
                @click=voteUp
            >
                <i class="fa fa-arrow-up"></i>
            </a>
            <a class="vote-button"
                :class="{ 'active-vote': hasVotedDown }"
                @click=voteDown
            >
                <i class="fa fa-arrow-down"></i>
            </a>
            <div
                class="collapsible-border"
                @click=toggleExpandCollapse>
            </div>
        </div>
        <a
            class="expand-button"
            @click=toggleExpandCollapse
            v-if=!isExpanded
        >
            +
        </a>
        <div class="comment-content">
            <span class="author">{{ comment.author }}</span>
            <span class="separator"> · </span>
            <span class="votes">
                {{ comment.upVotes - comment.downVotes }} points
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

@Component
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

    public mounted(): void {
        this.$emit("update:isExpanded", this.isExpanded);
    }

    private isExpanded: boolean = true;
    private isReplyingTo: boolean = false;

    private get shouldShowDelimiter(): boolean {
        const parentTail: CommentPrimitive[] = this.parentThread.threadTail;
        const isLast = this.comment === parentTail[parentTail.length - 1];
        return this.isExpanded && !isLast;
    }

    private toggleIsReplyingTo(): void {
        this.isReplyingTo = !this.isReplyingTo;
    }

    private toggleExpandCollapse(): void {
        this.isExpanded = !this.isExpanded;
        this.$emit("update:isExpanded", this.isExpanded);
    }

    private voteUp(): void {
        if (this.hasVotedUp) {
            store.commit.listen.revertVote(this.comment);
        } else {
            store.commit.listen.vote({ comment: this.comment, isVotePositive: true });
        }
    }

    private voteDown(): void {
        if (this.hasVotedDown) {
            store.commit.listen.revertVote(this.comment);
        } else {
            store.commit.listen.vote({ comment: this.comment, isVotePositive: false });
        }
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
            return this.comment.date.toLocaleDateString();
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
@import "../cssresources/theme.less";

@expansion-controls-padding: 0.75em;
@expansion-controls-width: 0.35em;
@expansion-controls-offset: 2 * @expansion-controls-padding + @expansion-controls-width;
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

.expanded-controls {
    height: 90%;
    // Absolute as otherwise can't have height: 100% on a parent with height: auto
    position: absolute;
    width: @expansion-controls-width;
    left: @expansion-controls-padding;

    .vote-button {
        cursor: pointer;
        height: 1em;
        padding: 0;
        transform: translate(-25%, 0);
        display: inline-block;

        text-align: center;
        background: transparent;
        & i {
            display: inline-block;
            height: 100%;
            color: @theme-neutral-color;
        }
        & i:hover {
            color: @theme-neutral-color-hover;
        }
        &.active-vote i {
            color: @theme-focus-color-4;
        }
        &.active-vote i:hover {
            color: @theme-focus-color-4-hover;
        }
    }
    .collapsible-border {
        height: calc(100% - 2em);
        width: 100%;
    }
}

.collapsible-border, .expand-button {
    background: @theme-focus-color-3;
    cursor: pointer;

    &:hover {
        background: @theme-focus-color-3-hover;
    }
}
.expand-button {
    position: absolute;
    border-radius: 50%;
    border: 0;
    padding: 0;
    left: @expansion-controls-padding / 2;
    font-size: 1.1em;
    width: @expansion-controls-width + @expansion-controls-padding;
    height: @expansion-controls-width + @expansion-controls-padding;
    text-align: center;
}

</style>
