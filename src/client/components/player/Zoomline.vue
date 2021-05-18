<template>
    <div
        ref="zoomline-container"
        class="zoomline-container"
        @click=onJumpToPosition
        @mousemove=onDrag
        @mouseleave=onStopDragging
        @mousedown.left=onStartDragging
        @mouseup.left=onStopDragging
    >
        <!-- Highlights the part of the audio which has already been played, only in Zoomline -->
        <div class="zoomline-played-until-now-cover"
            :style="{ width: normalize(currentAudioPosition.seconds) + '%'  }"
        >
        </div>

        <!-- Displays the small vertical lines that break down the timeline into small sections -->
        <div class="mark-container">
            <div class="mark" v-for="(timepoint, index) in computedMarks" :key="index">
                <div class="vertical-line"/>
                <div class="vertical-line-label">
                    {{ timepoint.format() }}
                </div>
            </div>
        </div>

        <!-- Displays a vertical line denoting the current audio position; -->
        <div
            class="current-play-position zoomline-play-position"
            v-if="currentAudioPosition.seconds >= rangeStart && currentAudioPosition.seconds <= rangeEnd"
            :style="{ left: normalize(currentAudioPosition.seconds) + '%' }"
        >
            <div class="current-play-position-label">
                {{ currentAudioPosition.format() }}
            </div>
        </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Timepoint from "@/logic/entities/Timepoint";
import MathHelpers from "@/logic/MathHelpers";

@Component
export default class Zoomline extends Vue {
    // Props
    // In seconds
    @Prop({ type: Number })
    public rangeStart!: number;
    // In seconds
    @Prop({ type: Number })
    public rangeEnd!: number;
    @Prop({ type: Timepoint })
    public currentAudioPosition!: Timepoint;

    public get computedMarks(): Timepoint[] { return [new Timepoint(this.rangeStart), new Timepoint(this.rangeEnd)]; }

    // Internal data members
    // Whether the user is currently dragging the corresponding element
    private isDraggingPlayElement: boolean = false;
    private timepointMarks: Timepoint[] = [];

    private normalize(value: number): number { return MathHelpers.normalize(value, this.rangeStart, this.rangeEnd); }

    // Moves the corresponding play element (cursor or window) to the given mouse pos
    private setPlayElementPositionFromMouse(mouseX: number): void {
        const rect = (this.$refs["zoomline-container"] as HTMLElement).getBoundingClientRect();
        const offsetXAsPercentage = (mouseX - rect.left) / rect.width;
        let newPosition = this.rangeStart + offsetXAsPercentage * (this.rangeEnd - this.rangeStart);

        // Clamp the new position within boundaries
        newPosition = MathHelpers.clamp(newPosition, this.rangeStart, this.rangeEnd);
        this.$emit("update:currentAudioPosition", newPosition);
    }

    private onJumpToPosition(event: MouseEvent): void {
        this.setPlayElementPositionFromMouse(event.clientX);
    }

    private onStartDragging(event: MouseEvent): void {
        this.onJumpToPosition(event);
        const leftMouseButton: number = 0;
        if (event.button === leftMouseButton) {
            this.isDraggingPlayElement = true;
        }
    }

    private onDrag(event: DragEvent): void {
        if (!this.isDraggingPlayElement) {
            return;
        }
        this.setPlayElementPositionFromMouse(event.clientX);
    }

    private onStopDragging(): void {
        this.isDraggingPlayElement = false;
    }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

.current-play-position {
    position: relative;
    top: -100%;
    height: 100%;
    width: 0.5%;
    min-width: 3px;
    background: @theme-focus-color-4;
    transition: @player-transition-time;
}

.zoomline-container {
    width: 100%;
    height: 100%;
    background: @theme-focus-color;
    // border: 2px solid @theme-focus-color-3;
    position: relative;
    user-select: none;
    cursor: pointer;
}

.mark-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
}
.mark {
    position: relative;
}

/* Design intention: position the line and the label next to each other with some spacing.
 * Have them have the same height
 */
.vertical-line {
    position: absolute;
    bottom: 0px;
    height: 1em;
    width: 2%;
    min-width: 2px;
    background: @theme-background;
}
.vertical-line-label {
    position: absolute;
    bottom: 0px;
    left: 0.25em;
}
.mark:last-child {
    & .vertical-line {
        right: 0;
    }
    & .vertical-line-label {
        transform: translate(-115%, 0%);
    }
}
.zoomline-played-until-now-cover {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: @theme-focus-color-2;
    transition: @player-transition-time;
}
.zoomline-play-position {
    cursor: ew-resize;
}
.current-play-position-label {
    padding-left: 0.5em;
}
</style>
