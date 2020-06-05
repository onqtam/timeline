<template>
  <div
    ref="timeline-container"
    class="timeline-container"
    @mousemove="onDragPlayPosition"
    @mouseleave="onStopDraggingPlayPosition"
  >
        <div class="mark-container">
            <div class="mark" v-for="mark in computedMarks" :key="mark.timepoint">
                <div class="vertical-line"></div>
                <div class="vertical-line-label">
                    {{ formatTimepoint(mark.timepoint) }}
                </div>
            </div>
        </div>
        <div
            class="current-play-position"
            @mousedown.left="onStartDraggingPlayPosition"
            @mouseup.left="onStopDraggingPlayPosition"
            :style="{ left: 100 * (currentAudioPosition - rangeStart)/(rangeEnd-rangeStart) + '%' }"
        >
            <div class="current-play-position-label">
                {{ formatTimepoint(currentAudioPosition) }}
            </div>
        </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

export enum TimelineLook {
    Line,
    Audiowave
};

class TimepointMarkInfo {
    public timepoint: number;

    constructor(timepointInSeconds: number) {
        this.timepoint = timepointInSeconds;
    }
}

@Component
export default class Timeline extends Vue {
    // Props
    @Prop()
    private look!: TimelineLook;
    @Prop({ type: Number })
    public rangeStart!: number;
    @Prop({ type: Number })
    public rangeEnd!: number;
    @Prop({ type: Number })
    public numberOfMarks!: number;
    @Prop({ type: Number })
    private currentAudioPosition!: number;

    public get computedMarks(): TimepointMarkInfo[] {
        if (!this._timepointMarks) {
            this._timepointMarks = [];
        }
        for (let i = 0; i < this.numberOfMarks + 1; i++) {
            const seconds = this.rangeStart + (i / this.numberOfMarks) * (this.rangeEnd - this.rangeStart);
            if (!this._timepointMarks[i]) {
                this._timepointMarks[i] = new TimepointMarkInfo(0);
            }
            this._timepointMarks[i].timepoint = seconds;
        }
        return this._timepointMarks;
    }

    // Internal data members
    private _isDraggingPlayPosition: boolean = false;
    private _timepointMarks: TimepointMarkInfo[] = [];

    // Public API
    public formatTimepoint(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        seconds -= hours * 3600;
        const minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;
        const leftOverSeconds = seconds;
        const tc = (val: number) => this.formatTimeComponent(val);

        if (hours > 0) {
            return `${tc(hours)}:${tc(minutes)}:${tc(leftOverSeconds)}`;
        }
        return `${tc(minutes)}:${tc(leftOverSeconds)}`;
    }

    public functionToSilenceWarnings(): void {
        console.log(this.look === TimelineLook.Line);
    }

    // Internal API
    private formatTimeComponent(value: number): string {
        return value.toFixed(0).padStart(2, "0");
    }

    private onStartDraggingPlayPosition(): void {
        this._isDraggingPlayPosition = true;
    }

    private onDragPlayPosition(event: DragEvent): void {
        if (this._isDraggingPlayPosition) {
            const rect = (this.$refs["timeline-container"] as HTMLElement).getBoundingClientRect();
            const offsetXAsPercentage = (event.clientX - rect.left) / rect.width;
            const newPosition = this.rangeStart + offsetXAsPercentage * (this.rangeEnd - this.rangeStart);
            this.$emit("update:currentAudioPosition", newPosition);
        }
    }

    private onStopDraggingPlayPosition(): void {
        this._isDraggingPlayPosition = false;
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
    border: 2px solid @theme-border-color;
    margin-bottom: 2%;
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
.current-play-position {
    position: relative;
    top: -100%;
    height: 100%;
    width: 0.5%;
    min-width: 3px;
    background: @theme-player-position-line-color;
    cursor: ew-resize;
}
.current-play-position-label {
    padding-left: 0.5em;
}
</style>
