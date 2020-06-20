<template>
    <div class="comment-thread-container">
        <router-link
            class="timepoint"
            :to="'/listen?t=' + thread.timepoint.seconds"
        >
            {{ thread.timepoint.format() }}
        </router-link>
        <CommentComponent
            :key=thread.threadHead.id
            :comment=thread.threadHead
            :parentThread=thread
            :shouldShowOnlyPreview=!isExpanded
            @update:isExpanded=setIsExpanded
        />
        <template v-for="commentPrimitive in thread.threadTail">
            <CommentComponent
                class="nested-comment-thread-element"
                v-if="!commentPrimitive.threadTail && isExpanded"
                :key=commentPrimitive.id
                :comment=commentPrimitive
                :parentThread=thread
            />
            <CommentThreadComponent
                class="nested-comment-thread-element"
                v-if="commentPrimitive.threadTail && isExpanded"
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

    // Should equal the value of isExpanded on the component for the head at all times
    private isExpanded: boolean = true;

    // Public API
    public setIsExpanded(isExpanded: boolean): void {
        this.isExpanded = isExpanded;
    }
}

</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.comment-thread-container {
    text-align: left;
    box-sizing: border-box;
    border-radius: 0 0 5% 5%;
    border: 2px solid @theme-neutral-color;
    background: @theme-background;
}
@indent-size: 0.5em;
.nested-comment-thread-element {
    margin-left: @indent-size;
    & .nested-comment-thread-element {
        margin-left: 2 * @indent-size;
        & .nested-comment-thread-element {
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
