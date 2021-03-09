<template>
    <div
        ref="timeline-container"
        class="timeline-container"
        @click=onJumpToPosition
        @mouseenter="showTooltip = true"
        @mousemove=onMove
        @mouseleave=onMouseLeave
        @mousedown.left=onStartDragging
        @mouseup.left=onStopDragging
        v-ripple
        @contextmenu="showContextMenu"
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

        <!-- this is the tooltip that follows the cursor and showing the position in the audio beneath -->
        <v-tooltip top :position-x="tooltip_x" :position-y="tooltip_y" v-model="showTooltip">{{ tooltipValue }}</v-tooltip>

        <!-- this is the right-click menu -->
        <v-menu v-model="shouldShowContextMenu" :position-x="right_click_menu_x" :position-y="right_click_menu_y" absolute offset-y>
            <v-list>
                <v-list-item-group> <!-- necessary for the hovering effects of the separate elements to be present -->
                    <v-list-item>
                        <v-list-item-title @click="copy_position">
                            <v-icon>mdi-link-variant</v-icon>
                            copy link to current position
                        </v-list-item-title>
                    </v-list-item>
                    <v-divider/>
                    <v-list-item>
                        <v-list-item-title @click="copy_range">
                            <v-icon>mdi-link-variant</v-icon>
                            copy link to range
                        </v-list-item-title>
                    </v-list-item>
                </v-list-item-group>
            </v-list>
        </v-menu>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Timepoint from "@/logic/entities/Timepoint";
import { AudioWindow } from "@/logic/AudioFile";
import MathHelpers from "@/logic/MathHelpers";
import { Clipboard } from "@/logic/MiscHelpers";

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
    public audioWindow!: AudioWindow;

    get windowStart(): number {
        return this.audioWindow.start.seconds;
    }
    get windowEnd(): number {
        return this.audioWindow.end.seconds;
    }

    // ================================================================
    // == tooltip when hovering over the timeline
    // ================================================================

    showTooltip = false;
    tooltip_x = 0;
    tooltip_y = 0;
    tooltipValue = "dfasdfasdfas";

    moveTooltip(e: MouseEvent) {
        if (!this.showTooltip) { return; }

        const newPosition = this.calculateCursorPositionFromMouse(e.clientX);
        this.tooltipValue = (new Timepoint(newPosition)).format();

        this.tooltip_x = e.x;
        this.tooltip_y = e.y;
    }

    // ================================================================
    // == right-click menu for the timeline
    // ================================================================

    shouldShowContextMenu = false;
    right_click_menu_x = 0;
    right_click_menu_y = 0;

    showContextMenu(e: MouseEvent) {
        e.preventDefault();
        this.shouldShowContextMenu = false;
        this.right_click_menu_x = e.clientX;
        this.right_click_menu_y = e.clientY;
        this.$nextTick(() => {
            this.shouldShowContextMenu = true;
        });
    }

    registerEscapeKeyHook() {
        const escapeHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && this.shouldShowContextMenu) {
                this.shouldShowContextMenu = false;
            }
        };

        document.addEventListener("keydown", escapeHandler);

        this.$once("hook:destroyed", () => {
            document.removeEventListener("keydown", escapeHandler);
        });
    }

    created() {
        this.registerEscapeKeyHook();
    }

    copy_position() {
        // TODO: probably rework this with something from the Vue router so that we don't hardcode the `#` symbol
        let url = window.location.origin;
        url += "/#/play/" + store.state.play.activeEpisode.id;
        url += "?t=" + this.currentAudioPosition.formatAsUrlParam();
        Clipboard.copyToClipboard(url);
    }

    copy_range() {
        // TODO: probably rework this with something from the Vue router so that we don't hardcode the `#` symbol
        let url = window.location.origin;
        url += "/#/play/" + store.state.play.activeEpisode.id;
        url += "?start=" + (new Timepoint(this.windowStart)).formatAsUrlParam();
        url += "&end=" + (new Timepoint(this.windowEnd)).formatAsUrlParam();
        Clipboard.copyToClipboard(url);
    }

    // ================================================================
    // == other stuff
    // ================================================================

    public get computedMarks(): Timepoint[] { return [new Timepoint(0), new Timepoint(this.audioWindow?.audioFile.duration)]; }

    // public get computedMarks(): Timepoint[] {
    //     if (!this.timepointMarks || this.timepointMarks.length !== this.numberOfMarks) {
    //         this.timepointMarks = [];
    //     }
    //     for (let i = 0; i < this.numberOfMarks + 1; i++) {
    //         const seconds = this.rangeStart + (i / this.numberOfMarks) * (this.rangeEnd - this.rangeStart);
    //         if (!this.timepointMarks[i]) {
    //             this.timepointMarks[i] = new Timepoint(0);
    //         }
    //         this.timepointMarks[i].seconds = seconds;
    //     }
    //     return this.timepointMarks;
    // }

    public get chartData(): IChartistData {
        const histogram = store.state.play.commentDensityHistogram;
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
        const histogram = store.state.play.commentDensityHistogram;
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

    private normalize(value: number): number { return MathHelpers.normalize(value, this.rangeStart, this.rangeEnd); }

    private calculateOffsetXAsPercentage(mouseX: number): number {
        const rect = (this.$refs["timeline-container"] as HTMLElement).getBoundingClientRect();
        return (mouseX - rect.left) / rect.width;
    }

    // calculates the cursor play position in the audio given mouse pos
    private calculateCursorPositionFromMouse(mouseX: number): number {
        const newPosition = this.rangeStart + this.calculateOffsetXAsPercentage(mouseX) * (this.rangeEnd - this.rangeStart);
        return MathHelpers.clamp(newPosition, this.rangeStart, this.rangeEnd);
    }

    // calculates the window start position in the audio given mouse pos
    private calculateWindowStartFromMouse(mouseX: number): number {
        const newPosition = this.rangeStart + this.calculateOffsetXAsPercentage(mouseX) * (this.rangeEnd - this.rangeStart) - this.audioWindow!.duration / 2;
        return MathHelpers.clamp(newPosition, this.rangeStart, this.rangeEnd - this.audioWindow!.duration);
    }

    // Moves the corresponding play element (cursor or window) to the given mouse pos
    private setPlayElementPositionFromMouse(mouseX: number): void {
        const newCursorPos = this.calculateCursorPositionFromMouse(mouseX);
        const newWindowStart = this.calculateWindowStartFromMouse(mouseX);
        this.$emit("update:audioWindowStart", newWindowStart);
        this.$emit("update:currentAudioPosition", newCursorPos);
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

    private onMove(event: MouseEvent): void {
        this.moveTooltip(event);
        // check if dragging
        if (!this.isDraggingPlayElement) {
            return;
        }
        this.setPlayElementPositionFromMouse(event.clientX);
    }

    private onStopDragging(): void {
        this.isDraggingPlayElement = false;
    }

    private onMouseLeave(): void {
        this.showTooltip = false;
        this.onStopDragging();
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
    box-sizing: content-box;
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
