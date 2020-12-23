<template>
    <div class="comment-controls-container">
        <div class="expanded-controls"
            v-if=isExpanded
        >
            <a class="vote-button"
                :class="{ 'active-vote': hasVotedUp() }"
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
                v-if=isCollapsible
                @click=toggleExpandCollapse>
            </div>
        </div>
        <a
            class="expand-button"
            @click=toggleExpandCollapse
            v-if="isCollapsible && !isExpanded"
        >
            +
        </a>
    </div>
</template>

<script lang="ts">

import { Component, Prop, Vue } from "vue-property-decorator";
import store from "@/client/store";
import Comment from "@/logic/entities/Comments";

@Component
export default class CommentControlsComponent extends Vue {
    // Props
    @Prop({ type: Comment })
    public readonly comment!: Comment;
    // Whether the control should even offer the collapse/expand controls or just the voting
    @Prop({ type: Boolean })
    public readonly isCollapsible!: boolean;

    public hasVotedUp(): boolean {
        console.log("== get hasVotedUp")
        let res = store.state.user.info.getVoteOnComment(this.comment.id) === true;
        console.log(res);
        return res;
    }
    public get hasVotedDown(): boolean {
        console.log("== get hasVotedDown")
        let res = store.state.user.info.getVoteOnComment(this.comment.id) === false;
        console.log(res);
        return res;
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
        console.log("== voteUp pressed!")
        if (this.hasVotedUp()) {
            console.log("== voteUp reverting!")
            store.dispatch.listen.revertVote(this.comment);
        } else {
            console.log("== voteUp voting!")
            store.dispatch.listen.vote({ comment: this.comment, isVotePositive: true });
        }
    }

    private voteDown(): void {
        console.log("== voteDown pressed!")
        if (this.hasVotedDown) {
            store.dispatch.listen.revertVote(this.comment);
        } else {
            store.dispatch.listen.vote({ comment: this.comment, isVotePositive: false });
        }
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";
@import "comments.less";

.comment-controls-container {
    z-index: 10;
    height: 90%;
    // Absolute as otherwise can't have height: 100% on a parent with height: auto
    position: absolute;
    width: @expansion-controls-width;
    left: @expansion-controls-padding;
}
.expanded-controls {
    height: 100%;

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
    border-radius: 50%;
    border: 0;
    padding: 0;
    position: absolute;
    left: -@expansion-controls-padding / 2;
    font-size: 1.2em;
    width: @expansion-controls-width + @expansion-controls-padding;
    height: @expansion-controls-width + @expansion-controls-padding;
    text-align: center;
}

</style>
