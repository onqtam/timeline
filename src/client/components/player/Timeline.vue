<template>
    <div
        ref="timeline-container"
        class="timeline-container"
        @click=onJumpToPosition
        @mousemove=onDrag
        @mouseleave=onStopDragging
        @mousedown.left=onStartDragging
        @mouseup.left=onStopDragging
    >
        <!-- Highlights the part of the audio that should be zoomed, only in Standard -->
        <div class="zoom-window"
            :style="{
                left: normalize(audioWindow.start.seconds) + '%',
                width: normalize(audioWindow.duration) + '%',
            }"
        >
        </div>

        <!-- Displays a chart of the audio file, only in Standard. The data in the chart varies depending on settings -->
        <VChart ref="chart" class="standard-chart" :type=ChartType.Line :data=chartData :options=chartOptions></VChart>

        <!-- Displays the small vertical lines that break down the timeline into small sections -->
        <div class="mark-container">
            <div class="mark" v-for="(timepoint, index) in computedMarks" :key="index">
                <div class="vertical-line"></div>
                <div class="vertical-line-label">
                    {{ timepoint.format() }}
                </div>
            </div>
        </div>

        <!-- Displays a vertical line denoting the current audio position; -->
        <div
            class="current-play-position standard-play-position"
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
import { AudioWindow } from "@/logic/AudioFile";
import MathHelpers from "@/logic/MathHelpers";

import VChart, { ChartType } from "../primitives/VChart.vue";
import Chartist, { IChartistData, ILineChartOptions } from "chartist";
import store from "../../store";

@Component({
    components: {
        VChart
    }
})
export default class Timeline extends Vue {
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
    @Prop()
    public audioWindow?: AudioWindow;

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

    public get chartData(): IChartistData {
        const histogram = store.state.listen.commentDensityHistogram;
        if (this.$refs.chart) {
            // Force update the chart element as Vue doesn't pick the changes for some reason
            (this.$refs.chart as Vue).$forceUpdate();
        }
        return {
            labels: histogram.xAxis,
            series: [histogram.yAxis]
        };
    }

    public get chartOptions(): ILineChartOptions {
        const histogram = store.state.listen.commentDensityHistogram;
        return {
            chartPadding: {
                right: 0, left: 0, top: 0, bottom: 0
            },
            showArea: false,
            showPoint: false,
            axisX: {
                showGrid: false,
                offset: 0,
                type: Chartist.StepAxis,
                ticks: histogram.xAxis
            },
            axisY: {
                showGrid: false,
                offset: 0
            }
        };
    }

    // Internal data members
    // Whether the user is currently dragging the corresponding element
    private isDraggingPlayElement: boolean = false;
    private timepointMarks: Timepoint[] = [];
    // Store the enum as a member to access it in the template
    private ChartType = ChartType;

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
        let newPosition = this.rangeStart +
            offsetXAsPercentage * (this.rangeEnd - this.rangeStart) -
            this.audioWindow!.duration / 2 - 1; // we want to position the window so that the cursor ends up in the middle of it

        // Clamp the new position within boundaries
        newPosition = MathHelpers.clamp(newPosition, this.rangeStart, this.rangeEnd - this.audioWindow!.duration);
        // In Standard mode, also snap to the nearest timeslot
        // newPosition = this.audioWindow!.findTimeslotStartForTime(newPosition);
        this.$emit("update:audioWindowStart", newPosition);
    }

    private onJumpToPosition(event: MouseEvent): void {
        // console.log("🚀 onJumpToPosition")
        this.setPlayElementPositionFromMouse(event.clientX);
    }

    private onStartDragging(event: MouseEvent): void {
        this.onJumpToPosition(event);
        // console.log("🚀 onStartDragging")
        const leftMouseButton: number = 0;
        if (event.button === leftMouseButton) {
            this.isDraggingPlayElement = true;
        }
    }

    private onDrag(event: DragEvent): void {
        // console.log("🚀 onDrag")
        if (!this.isDraggingPlayElement) {
            return;
        }
        // console.log("🚀 onDrag ACTUAL")
        this.setPlayElementPositionFromMouse(event.clientX);
    }

    private onStopDragging(): void {
        // console.log("🚀 onStopDragging")
        this.isDraggingPlayElement = false;
    }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

.timeline-container {
    width: 100%;
    height: 100%;
    background: @theme-focus-color;
    // border: 2px solid @theme-focus-color-3;
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
.zoom-window {
    z-index: 1;
    position: absolute;
    top: 0;
    height: 100%;
    background: @theme-focus-color-2;
    @border: 0.1em double white;
    border-left: @border;
    border-right: @border;
    cursor: ew-resize;
    transition: @player-transition-time;
}
.standard-chart {
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    position: absolute;
}

.current-play-position-label {
    padding-left: 0.5em;
}
</style>
