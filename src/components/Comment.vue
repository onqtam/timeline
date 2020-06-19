<template>
    <div class="comment-container">
        <span class="author">{{ comment.author }}</span>
        <span class="separator"> · </span>
        <span class="votes">
            {{ comment.upVotes }}&#8593; /
            {{ comment.formatApprovalRating() }}
        </span>
        <br/>
        <span class="date">{{ comment.date.toLocaleDateString() }}</span>
        <hr>
        <p class="comment-section">
            {{ contentToDisplay }}
        </p>
    </div>
</template>

<script lang="ts">

import { Component, Prop, Vue } from "vue-property-decorator";
import { Comment } from "@/logic/Comments";

@Component
export default class CommentComponent extends Vue {
    // Props
    @Prop({ type: Comment })
    public comment!: Comment;
    @Prop({ type: Boolean })
    public shouldShowOnlyPreview!: boolean;

    public get contentToDisplay(): string {
        const MAX_PREVIEW_CHAR_LIMIT = 47;
        if (this.shouldShowOnlyPreview && this.comment.content.length > MAX_PREVIEW_CHAR_LIMIT) {
            return this.comment.content.substr(0, MAX_PREVIEW_CHAR_LIMIT) + "...";
        }
        return this.comment.content;
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-container {
    text-align: left;
    padding-left: 1em;
}
.votes, .date, .separator {
    color: @theme-neutral-color;
}
</style>
