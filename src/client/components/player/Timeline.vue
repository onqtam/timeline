<template>
    <div
        ref="timeline-container"
        class="timeline-container"
        @click=onJumpToPosition
        @mouseenter="mouseHover = true"
        @mousemove=onMove
        @mouseleave=onMouseLeave
        @mousedown.left=onStartDragging
        @mouseup.left=onStopDragging
        v-ripple
        @contextmenu="showContextMenu"
    >

        <!-- BEAUTIFUL MAGIC NUMBERS - NO CLUE HOW/WHY IT WORKS!!!
        Adapted from here: https://stackoverflow.com/a/30921225
        I also tried with fittext from here but couldn't get it to work:
        https://css-tricks.com/fitting-text-to-a-container/ -->
        <div style="position: absolute; height: 80px; width: 100%;">
            <svg width="100%" height="100%" viewBox="0 0 1000 70">
                <text x="80" y="49" font-size="45" fill="rgba(255, 255, 255, 0.3)">
                    {{histrogramText}}
                </text>
            </svg>
        </div>

        <!-- Highlights the part of the audio that should be zoomed -->
        <div class="zoom-window" :style=computeWindowStyle
            :class="shouldAnimate ? 'animated-transition' : ''"
        >
            <div class="mark-container pt-6">
                <div class="mark" v-for="(timepoint, index) in windowTimepoints" :key=index>
                    <div class="window-label"
                        :class="isZoomline ? 'window-label-zoomline-offset' : ''"
                    >
                        {{ timepoint.format() }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Displays a chart of the audio file, only in Standard. -->
        <Chart v-if=!isZoomline ref="chart"/>

        <!-- Displays the small vertical lines that break down the timeline into small sections -->
        <div class="mark-container">
            <div class="mark" v-for="(timepoint, index) in runtimeTimepoints" :key=index>
                <div v-if="!isZoomline" class="runtime-label">
                    {{ timepoint.format() }}
                </div>
            </div>
        </div>

        <!-- Displays a vertical line denoting the current audio position; -->
        <div class="current-play-position"
            :class="shouldAnimate ? 'animated-transition' : ''"
            v-if="currentAudioPosition.seconds >= rangeStart && currentAudioPosition.seconds <= rangeEnd"
            :style="{ left: 'calc(' + normalize(currentAudioPosition.seconds) + '% - 1px)' }"
        >
            <div class="current-play-position-label"
                :style="{ transform: 'translateX(-' + normalize(currentAudioPosition.seconds) + '%)' }"
            >
                {{ currentAudioPosition.format() }}
            </div>
        </div>

        <!-- this is the tooltip that follows the cursor and showing the position in the audio beneath -->
        <v-tooltip top :position-x=tooltip_x :position-y=tooltip_y v-model=showTooltip>{{ tooltipValue }}</v-tooltip>

        <!-- this is the right-click menu -->
        <v-menu v-model=shouldShowContextMenu :position-x=right_click_menu_x :position-y=right_click_menu_y absolute offset-y>
            <v-list>
                <v-list-item-group> <!-- necessary for the hovering effects of the separate elements to be present -->
                    <v-list-item>
                        <v-list-item-title @click=copy_position>
                            <v-icon>mdi-link-variant</v-icon>
                            copy link to current position
                        </v-list-item-title>
                    </v-list-item>
                    <v-divider/>
                    <v-list-item>
                        <v-list-item-title @click=copy_range>
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
import { default as Chart } from "./Chart.vue";
import { Clipboard } from "@/logic/MiscHelpers";

import store from "../../store";

@Component({
    components: {
        Chart
    }
})
export default class Timeline extends Vue {
    @Prop({ type: Timepoint })
    public currentAudioPosition!: Timepoint;
    @Prop()
    public audioWindow!: AudioWindow;
    @Prop({ type: Boolean })
    public isZoomline!: boolean;
    @Prop({ type: Boolean })
    public showCursorTooltip!: boolean;
    @Prop({ type: Boolean })
    public shouldAnimate!: boolean;

    get rangeStart(): number {
        return this.isZoomline ? this.audioWindow.start.seconds : 0;
    }
    get rangeEnd(): number {
        return this.isZoomline ? this.windowEnd : this.audioWindow.audioFile.duration;
    }

    get windowStart(): number {
        return this.audioWindow.start.seconds;
    }
    get windowEnd(): number {
        return this.audioWindow.end.seconds;
    }
    get computeWindowStyle(): string {
        let left = 0;
        let width = 100;
        if (!this.isZoomline) {
            left = this.normalize(this.audioWindow.start.seconds);
            width = this.normalize(this.audioWindow.duration);
        }
        return "left: calc(" + left + "% - 0.02em); width: calc(" + width + "% - 0.1em);";
    }

    get histrogramText() {
        return "comment density histogram (" + store.state.play.numberOfCommentsTotal + " comments)";
    }

    // ================================================================
    // == tooltip when hovering over the timeline
    // ================================================================

    get showTooltip(): boolean {
        return this.mouseHover && this.showCursorTooltip;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    set showTooltip(_value: boolean) {} // sometimes gets assigned to probably because of the v-model - ignore it.

    mouseHover = false;
    tooltip_x = 0;
    tooltip_y = 0;
    tooltipValue = "";

    moveTooltip(e: MouseEvent): void {
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

    showContextMenu(e: MouseEvent): void {
        e.preventDefault();
        this.shouldShowContextMenu = false;
        this.right_click_menu_x = e.clientX;
        this.right_click_menu_y = e.clientY;
        this.$nextTick(() => {
            this.shouldShowContextMenu = true;
        });
    }

    registerEscapeKeyHook(): void {
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

    created(): void {
        this.registerEscapeKeyHook();
    }

    copy_position(): void {
        let url = window.location.origin;
        url += "/play/" + store.state.play.activeEpisode.id;
        url += "?t=" + this.currentAudioPosition.formatAsUrlParam();
        Clipboard.copyToClipboard(url);
    }

    copy_range(): void {
        let url = window.location.origin;
        url += "/play/" + store.state.play.activeEpisode.id;
        url += "?start=" + this.audioWindow.start.formatAsUrlParam();
        url += "&end=" + this.audioWindow.end.formatAsUrlParam();
        Clipboard.copyToClipboard(url);
    }

    // ================================================================
    // == other stuff
    // ================================================================

    get windowTimepoints(): Timepoint[] {
        return [new Timepoint(this.windowStart), new Timepoint(this.windowEnd)];
    }
    get runtimeTimepoints(): Timepoint[] {
        return [new Timepoint(0), new Timepoint(this.audioWindow?.audioFile.duration)];
    }

    // Internal data members
    // Whether the user is currently dragging the corresponding element
    private isDraggingPlayElement: boolean = false;

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
        if (!this.audioWindow.containsTimepoint(newCursorPos)) {
            const newWindowStart = this.calculateWindowStartFromMouse(mouseX);
            if (this.windowStart !== newWindowStart) {
                this.$emit("update:audioWindowStart", newWindowStart);
            }
        }
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
        this.mouseHover = false;
        this.onStopDragging();
    }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

.animated-transition {
    transition: @player-transition-time;
    transition-timing-function: @player-transition-timing-function;
}

.current-play-position {
    position: relative;
    top: -100%;
    height: 100%;
    width: 0.2em;
    background: @theme-focus-color-4;
    z-index: 2;
}

.current-play-position-label {
    padding-top: 1.7em;
    display: inline-block;
}

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

.runtime-label {
    position: absolute;
    top: 0.25em;
    left: 0.25em;
}
.mark:last-child {
    & .runtime-label {
        transform: translate(-115%, 0%);
    }
}

.window-label {
    position: absolute;
    bottom: 0px;
    left: -0.1em;
    font-size: 0.9em;
}
.mark:first-child {
    & .window-label {
        transform: translateX(-100%);
    }
}
.window-label-zoomline-offset {
    transform: translateX(-100%);
}
.mark:first-child {
    & .window-label-zoomline-offset {
        transform: translateX(0%);
    }
}

.zoom-window {
    z-index: 1;
    position: absolute;
    top: 0;
    height: 100%;
    background: @theme-focus-color-2;
    @border: 0.1em solid rgba(255, 255, 255, 0.7);
    border-left: @border;
    border-right: @border;
    box-sizing: content-box;
}

</style>
