<template>
    <div
        ref="timeline-container"
        class="timeline-container"
        @click=onJumpToPosition
        @mousemove=onDrag
        @mouseleave=onStopDragging
    >
        <!-- Highlights the part of the audio which has already been played, only in Zoomline -->
        <div class="zoomline-played-until-now-cover"
            v-if="mode === TimelineMode.Zoomline"
            :style="{ width: normalize(currentAudioPosition.seconds) + '%'  }"
        >
        </div>

        <!-- Highlights the part of the audio that should be zoomed, only in Standard -->
        <div class="standard-zoom-window"
            v-if="mode === TimelineMode.Standard"
            @mousedown.left=onStartDragging
            @mouseup.left=onStopDragging
            :style="{
                left: normalize(audioWindow.start.seconds) + '%',
                width: normalize(audioWindow.duration) + '%',
            }"
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
            class="current-play-position"
            v-if="currentAudioPosition.seconds >= rangeStart && currentAudioPosition.seconds <= rangeEnd"
            v-on="mode === TimelineMode.Zoomline ? { 'mousedown': onStartDragging, 'mouseup': onStopDragging } : {}"
            :class="{ 'standard-play-position': mode === TimelineMode.Timeline, 'zoomline-play-position': mode === TimelineMode.Zoomline }"
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
import Timepoint from "@/logic/Timepoint";
import { AudioWindow } from "@/logic/AudioFile";
import MathHelpers from "@/logic/MathHelpers";

export enum TimelineMode {
    Standard,
    Zoomline
};

// This class operates in 2 distinct modes - as a standard timeline and as a zoomline
// Any members/functions which are solely used in one the modes must be suffixed with _<mode>
@Component
export default class Timeline extends Vue {
    // Props
    @Prop({ type: Number })
    public mode!: TimelineMode;
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
    // Only used in standard mode
    @Prop()
    public audioWindow?: AudioWindow;

    public get computedMarks(): Timepoint[] {
        if (!this.timepointMarks) {
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
    // In Standard mode, this is the play window
    private isDraggingPlayElement: boolean = false;
    private timepointMarks: Timepoint[] = [];
    // Store the enum as a member to access it in the template
    private TimelineMode = TimelineMode;

    // Internal API
    // Converts the given value in a percentage between the current rangeStart and rangeEnd, clamped in [0;100]
    private normalize(value: number): number {
        const percentage = 100 * (value - this.rangeStart)/(this.rangeEnd-this.rangeStart);
        const normalized = MathHelpers.clamp(percentage, 0, 100);
        return normalized;
    }

    // Moves the corresponding play element (cursor or window) to the given mouse pos
    private setPlayElementPositionFromMouse(mouseX: number): void {
        const rect = (this.$refs["timeline-container"] as HTMLElement).getBoundingClientRect();
        const offsetXAsPercentage = (mouseX - rect.left) / rect.width;
        let newPosition = this.rangeStart + offsetXAsPercentage * (this.rangeEnd - this.rangeStart);

        // Clamp the new position within boundaries
        // In Standard mode, also snap to the nearest timeslot
        switch (this.mode) {
        case TimelineMode.Standard:
            newPosition = MathHelpers.clamp(newPosition, this.rangeStart, this.rangeEnd - this.audioWindow!.duration);
            newPosition = Math.floor(newPosition / this.audioWindow!.timeslotDuration) * this.audioWindow!.timeslotDuration;
            this.$emit("update:audioWindowStart", newPosition);
            break;
        case TimelineMode.Zoomline:
            newPosition = MathHelpers.clamp(newPosition, this.rangeStart, this.rangeEnd);
            this.$emit("update:currentAudioPosition", newPosition);
            break;
        default:
            console.assert(false);
        }
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
    private onStartDraggingWindow(event: MouseEvent): void {
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
        this.isDraggingPlayElement = false;
    }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../cssresources/theme.less";

.timeline-container {
    width: 100%;
    height: 150px;
    background: @theme-focus-color;
    border: 2px solid @theme-focus-color-3;
    margin-bottom: 2%;
    position: relative;
    box-sizing: border-box;
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
.standard-zoom-window {
    position: absolute;
    top: 0;
    height: 100%;
    background: @theme-focus-color-2;
    @border: 0.1em double white;
    border-left: @border;
    border-right: @border;
    cursor: ew-resize;
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
