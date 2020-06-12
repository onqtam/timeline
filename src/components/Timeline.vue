<template>
    <div
        ref="timeline-container"
        class="timeline-container"
        @mousemove="onDragPlayPosition"
        @mouseleave="onStopDraggingPlayPosition"
    >
        <!-- Highlights the part of the audio which has already been played -->
        <div class="played-until-now-cover"
            :style="{ width: 100 * (currentAudioPosition.seconds - rangeStart)/(rangeEnd-rangeStart) + '%'  }"
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

        <!-- Displays a vertical line denoting the current audio position -->
        <div
            class="current-play-position"
            @mousedown.left="onStartDraggingPlayPosition"
            @mouseup.left="onStopDraggingPlayPosition"
            :style="{ left: 100 * (currentAudioPosition.seconds - rangeStart)/(rangeEnd-rangeStart) + '%' }"
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

export enum TimelineLook {
    Line,
    Audiowave
};

@Component
export default class Timeline extends Vue {
    // Props
    @Prop()
    public look!: TimelineLook;
    @Prop({ type: Number })
    // In seconds
    public rangeStart!: number;
    @Prop({ type: Number })
    // In seconds
    public rangeEnd!: number;
    @Prop({ type: Number })
    public numberOfMarks!: number;
    @Prop({ type: Timepoint })
    public currentAudioPosition!: Timepoint;

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
    private isDraggingPlayPosition: boolean = false;
    private timepointMarks: Timepoint[] = [];

    public functionToSilenceWarnings(): void {
        console.log(this.look === TimelineLook.Line);
    }

    // Internal API
    private formatTimeComponent(value: number): string {
        return value.toFixed(0).padStart(2, "0");
    }

    private onStartDraggingPlayPosition(): void {
        this.isDraggingPlayPosition = true;
    }

    private onDragPlayPosition(event: DragEvent): void {
        if (this.isDraggingPlayPosition) {
            const rect = (this.$refs["timeline-container"] as HTMLElement).getBoundingClientRect();
            const offsetXAsPercentage = (event.clientX - rect.left) / rect.width;
            const newPosition = this.rangeStart + offsetXAsPercentage * (this.rangeEnd - this.rangeStart);
            this.$emit("update:currentAudioPosition", newPosition);
        }
    }

    private onStopDraggingPlayPosition(): void {
        this.isDraggingPlayPosition = false;
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
    position: relative;
    box-sizing: border-box;
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
.played-until-now-cover {
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
    background: @theme-player-position-line-color;
    cursor: ew-resize;
}
.current-play-position-label {
    padding-left: 0.5em;
}
</style>
