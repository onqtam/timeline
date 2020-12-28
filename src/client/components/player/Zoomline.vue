<template>
    <div
        ref="zoomline-container"
        class="zoomline-container"
        @click=onJumpToPosition
        @mousemove=onDrag
        @mouseleave=onStopDragging
    >
        <!-- Highlights the part of the audio which has already been played, only in Zoomline -->
        <div class="zoomline-played-until-now-cover"
            :style="{ width: normalize(currentAudioPosition.seconds) + '%'  }"
        >
        </div>

        <!-- Displays the small vertical lines that break down the timeline into small sections -->
        <div class="mark-container">
            <div class="mark" v-for="(timepoint, index) in computedMarks" :key="index">
                <div class="vertical-line"></div>
                <div class="vertical-line-label">
                    {{ timepoint.format() }}
                </div>
            </div>
        </div>

        <!-- Displays a vertical line denoting the current audio position;
            Only bind handlers if this is a zoomline; Use the ugly v-on syntax as the other one doesn't support conditional binding
            + make sure this isn't visible in the zoomline where the audioPos might now be in range
        -->
        <div
            class="current-play-position zoomline-play-position"
            v-if="currentAudioPosition.seconds >= rangeStart && currentAudioPosition.seconds <= rangeEnd"
            @mousedown="onStartDragging"
            @mouseup="onStopDragging"
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

import store from "../../store";

@Component
export default class Zoomline extends Vue {
    // Props
    // In seconds
    @Prop({ type: Number })
    public rangeStart!: number;
    // In seconds
    @Prop({ type: Number })
    public rangeEnd!: number;
    @Prop({ type: Number })
    public numberOfMarks!: number;
    @Prop({ type: Timepoint })
    public currentAudioPosition!: Timepoint;

    public get computedMarks(): Timepoint[] {
        if (!this.timepointMarks || this.timepointMarks.length !== this.numberOfMarks) {
            this.timepointMarks = [];
        }
        for (let i = 0; i < this.numberOfMarks + 1; i++) {
            const seconds = this.rangeStart + (i / this.numberOfMarks) * (this.rangeEnd - this.rangeStart);
            if (!this.timepointMarks[i]) {
                this.timepointMarks[i] = new Timepoint(0);
            }
            this.timepointMarks[i].seconds = seconds;
        }
        return this.timepointMarks;
    }

    // Internal data members
    // Whether the user is currently dragging the corresponding element
    // In Zoomline mode, this is the play cursor
    private isDraggingPlayElement: boolean = false;
    private timepointMarks: Timepoint[] = [];

    // Internal API
    // Converts the given value in a percentage between the current rangeStart and rangeEnd, clamped in [0;100]
    private normalize(value: number): number {
        const percentage = 100 * (value - this.rangeStart)/(this.rangeEnd-this.rangeStart);
        const normalized = MathHelpers.clamp(percentage, 0, 100);
        return normalized;
    }

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

.zoomline-container {
    width: 100%;
    height: 100%;
    background: @theme-focus-color;
    border: 2px solid @theme-focus-color-3;
    position: relative;
    user-select: none;
    cursor: pointer; /* Show we are clickable */
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
    min-width: 3px;
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
}
.current-play-position {
    position: relative;
    top: -100%;
    height: 100%;
    width: 0.5%;
    min-width: 3px;
    background: @theme-focus-color-4;
}
.zoomline-play-position {
    cursor: ew-resize;
}
.current-play-position-label {
    padding-left: 0.5em;
}
</style>
