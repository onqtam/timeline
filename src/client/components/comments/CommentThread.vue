<template>
    <!-- Set the thread id as element id to be able to find thread's DOM element from other systems  -->
    <div class="comment-thread-container" :id=thread.id>
        <router-link
            class="timepoint"
            :style=routerLinkPositionStyle
            :to="'?t=' + thread.start.formatAsUrlParam() + '&thread=' + thread.id"
        >
            <!-- Switch the order if we are close to the end -->
            <v-icon v-if=routerLinkPlacePointerOnLeft>mdi-caret-up</v-icon>
            {{ thread.start.format() }}
            <v-icon v-if=!routerLinkPlacePointerOnLeft>mdi-caret-up</v-icon>
        </router-link>
        <CommentControlsComponent
            :key=thread.id
            :comment=thread
            :isExpanded.sync=isExpanded
            :isCollapsible=thread.hasReplies
        />
        <CommentComponent
            :comment=thread
            :parentThread=null
            :shouldShowOnlyPreview=!isExpanded
        />
        <template v-for="comment in thread.replies">
            <CommentComponent
                class="nested-comment-thread-element"
                v-if="!comment.hasReplies && isExpanded"
                :key=comment.id
                :comment=comment
                :parentThread=thread
            />
            <CommentThreadComponent
                class="nested-comment-thread-element"
                v-if="comment.hasReplies && isExpanded"
                :key=comment.id
                :thread=comment
            />
        </template>
    </div>
</template>

<script lang="ts">

import { Component, Prop, Vue } from "vue-property-decorator";
import store from "@/client/store";
import Comment from "@/logic/entities/Comments";
import { AudioWindow } from "@/logic/AudioFile";
import MathHelpers from "@/logic/MathHelpers";

import CommentComponent from "./Comment.vue";
import CommentControlsComponent from "./CommentControls.vue";

@Component({
    components: {
        CommentComponent,
        CommentControlsComponent
    }
})
export default class CommentThreadComponent extends Vue {
    // Props
    @Prop({ type: Comment })
    public thread!: Comment;
    // The index of the timeslot this thread is rendered into
    @Prop({ type: Number })
    public timeslotIndex!: number;

    // Should equal the value of isExpanded on the component for the head at all times
    private isExpanded: boolean = true;

    // Returns a Vue-like object with position data to place the routerlink for the thread at the correct position
    private get routerLinkPositionStyle(): Record<string, string> {
        const offset: number = this.timepointOffset;
        if (offset > 0.5) {
            return { right: 100 * (1-offset) + "%" };
        } else {
            return { left: 100 * offset + "%" };
        }
    }
    private get routerLinkPlacePointerOnLeft(): boolean {
        return this.timepointOffset <= 0.5;
    }

    // Returns the offset of the timepoint in the current timeslot
    private get timepointOffset(): number {
        const audioWindow: AudioWindow = store.state.play.audioWindow;
        const timeslotStart: number = audioWindow.start.seconds + this.timeslotIndex * audioWindow.timeslotDuration;
        const percentage = (this.thread.start.seconds - timeslotStart) / audioWindow.timeslotDuration;
        // TODO: This is to prevent the position to go beyond the border of the thread
        // The proper computation should be 1 - width of timepoint element
        return MathHelpers.clamp(percentage, 0, 0.75);
    }

    // Public API
    public setIsExpanded(isExpanded: boolean): void {
        this.isExpanded = isExpanded;
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

@top-border-width: 1em;
.comment-thread-container {
    text-align: left;
    border-radius: 0 0 5% 5%;
    border: 2px solid @theme-neutral-color;
    border-top-width: @top-border-width;
    background: @theme-background;
    padding-top: 0.25em;
    position: relative;
    z-index: 1;
}

.nested-comment-thread-element {
    // Negate things which shouldn't be available in a subthread
    &.comment-thread-container {
        border: 0px;
        .timepoint {
            display: none;
        }
    }
    margin-left: 0.75em;
}

.timepoint {
    position: absolute;
    top: -@top-border-width;
    font-weight: bold;
    background: @theme-background;
    &, & i {
        color: @theme-neutral-color;
    }
    &:hover, &:hover i {
        color: @theme-neutral-color-hover;
    }
    padding: 0 0.25em;
    & i {
        text-decoration: none;
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
