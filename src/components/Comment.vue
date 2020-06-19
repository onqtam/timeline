<template>
    <div class="comment-container">
        <div
            class="collapsible-border"
            @click=toggleExpandCollapse
            v-if=isExpanded>
        </div>
        <button
            class="expand-button"
            @click=toggleExpandCollapse
            v-if=!isExpanded
        >
            +
        </button>
        <div class="comment-content">
            <span class="author">{{ comment.author }}</span>
            <span class="separator"> · </span>
            <span class="votes">
                {{ comment.upVotes }}&#8593; /
                {{ comment.formatApprovalRating() }}
            </span>
            <br/>
            <span class="date">{{ comment.date.toLocaleDateString() }}</span>
            <hr v-if=isExpanded>
            <p class="comment-section" v-if=isExpanded>
                {{ contentToDisplay }}
            </p>
        </div>
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

    public mounted(): void {
        this.$emit("update:isExpanded", this.isExpanded);
    }

    private isExpanded: boolean = true;

    private toggleExpandCollapse(): void {
        this.isExpanded = !this.isExpanded;
        this.$emit("update:isExpanded", this.isExpanded);
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

@collapsible-border-padding: 0.75em;
@collapsible-border-width: 0.35em;
@collapsible-border-offset: 2 * @collapsible-border-padding + @collapsible-border-width;
.comment-container {
    text-align: left;
    padding-left: @collapsible-border-offset;
    position: relative;
}
.votes, .date, .separator {
    color: @theme-neutral-color;
}

.collapsible-border, .expand-button {
    background: @theme-focus-color-3;
    // Absolute as otherwise can't have height: 100% on a parent with height: auto
    position: absolute;
    transition: border 0.5s linear;
    cursor: pointer;

    &:hover {
        background: @theme-focus-color-3-hover;
    }
}
.collapsible-border {
    height: 95%;
    width: @collapsible-border-width;
    left: @collapsible-border-padding;
}
.expand-button {
    border-radius: 50%;
    border: 0;
    padding: 0;
    left: @collapsible-border-padding / 2;
    font-size: 1.1em;
    width: @collapsible-border-width + @collapsible-border-padding;
    height: @collapsible-border-width + @collapsible-border-padding;
    text-align: center;
}

</style>
