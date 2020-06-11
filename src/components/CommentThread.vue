<template>
    <div class="comment-thread-container">
        <button @click=toggleExpandCollapse>
            <span v-if=!$data.isExpanded>-</span>
            <span v-if=$data.isExpanded>+</span>
        </button>
        <CommentComponent
            :key=thread.threadHead.id
            :comment=thread.threadHead
            v-if=$data.isExpanded
        />
        <template v-for="commentPrimitive in thread.threadTail">
            <CommentComponent
                class="nested-comment-thread-element"
                v-if="!commentPrimitive.threadTail && $data.isExpanded"
                :key=commentPrimitive.id
                :comment=commentPrimitive
            />
            <CommentThreadComponent
                class="nested-comment-thread-element"
                v-if="commentPrimitive.threadTail && $data.isExpanded"
                :key=commentPrimitive.id
                :thread=commentPrimitive
            />
        </template>
    </div>
</template>

<script lang="ts">

import { Component, Prop, Vue } from "vue-property-decorator";
import { default as CommentThread } from "@/logic/Comments";

import CommentComponent from "./Comment.vue";

@Component({
    components: {
        CommentComponent
    },
    name: "CommentThreadComponent"
})
export default class CommentThreadComponent extends Vue {
    // Props
    @Prop({ type: CommentThread })
    public thread!: CommentThread;

    private isExpanded: boolean = true;

    // Public API
    public toggleExpandCollapse(): void {
        this.isExpanded = !this.isExpanded;
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-thread-container {
    border-left: 4px solid @theme-border-color;
    text-align: left;
}

@indent-size: 1em;
.nested-comment-thread-element {
    margin-left: @indent-size;
    &.nested-comment-thread-element {
        margin-left: 2 * @indent-size;
        &.nested-comment-thread-element {
            margin-left: 3 * @indent-size;
        }
    }
}

button {
    @button-dimensions: 0.5em;
    margin-left: -2 * @button-dimensions;
    & span {
        color: black;
        font-size: 2 * @button-dimensions;
        width: @button-dimensions;
        height: @button-dimensions;
        text-align: center;
        display: table-cell;
        vertical-align: middle
    }
}
</style>
