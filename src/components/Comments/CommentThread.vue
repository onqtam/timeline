<template>
    <!-- Set the thread id as element id to be able to find thread's DOM element from other systems  -->
    <div class="comment-thread-container" :id=thread.id>
        <router-link
            class="timepoint"
            :style="{ left: 100 * timepointOffset + '%' }"
            :to="'/listen?t=' + thread.timepoint.formatAsUrlParam() + '&thread=' + thread.id"
        >
            <i class="fa fa-caret-up" aria-hidden="true"></i>
            {{ thread.timepoint.format() }}
        </router-link>
        <CommentControlsComponent
            :key=thread.threadHead.id
            :comment=thread.threadHead
            :isExpanded.sync=isExpanded
            :isCollapsible=thread.hasReplies
        />
        <CommentComponent
            :comment=thread.threadHead
            :parentThread=thread
            :shouldShowOnlyPreview=!isExpanded
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
import store from "@/store";
import { default as CommentThread } from "@/logic/Comments";
import { AudioWindow } from "@/logic/AudioFile";
import MathHelpers from "@/logic/MathHelpers";

import CommentComponent from "./Comment.vue";
import CommentControlsComponent from "./CommentControls.vue";

@Component({
    components: {
        CommentComponent,
        CommentControlsComponent
    },
    name: "CommentThreadComponent"
})
export default class CommentThreadComponent extends Vue {
    // Props
    @Prop({ type: CommentThread })
    public thread!: CommentThread;
    // The index of the timeslot this thread is rendered into
    @Prop({ type: Number })
    public timeslotIndex!: number;

    // Should equal the value of isExpanded on the component for the head at all times
    private isExpanded: boolean = true;

    // Returns the offset of the timepoint in the current timeslot
    private get timepointOffset(): number {
        const audioWindow: AudioWindow = store.state.listen.audioWindow;
        const timeslotStart: number = audioWindow.start.seconds + this.timeslotIndex * audioWindow.timeslotDuration;
        const percentage = (this.thread.timepoint.seconds - timeslotStart) / audioWindow.timeslotDuration;
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
    box-sizing: border-box;
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
