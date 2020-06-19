<template>
    <div class="comment-container">
        <div class="expanded-controls"
            v-if=isExpanded
        >
            <a class="vote-button"
                @click=voteUp
            >
                <i class="fa fa-arrow-up"></i>
            </a>
            <a class="vote-button"
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

    private voteUp(): void {
        this.$emit("vote", this.comment, 1);
    }

    private voteDown(): void {
        this.$emit("vote", this.comment, -1);
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

.expanded-controls {
    height: 95%;
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
