<template>
  <div
    ref="timeline-container"
    class="timeline-container"
    @mousemove="onDragPlayPosition"
  >
        <div class="mark-container">
            <div class="mark" v-for="markTime in numberOfMarks + 1" :key="markTime">
                <div class="vertical-line"></div>
                <div class="vertical-line-label">
                    {{ formatTimepoint(((markTime-1)/numberOfMarks) * (rangeEnd - rangeStart)) }}
                </div>
            </div>
        </div>
        <div
            class="current-play-position"
            @mousedown.left="onStartDraggingPlayPosition"
            @mouseup.left="onStopDraggingPlayPosition"
            :style="{ left: 100 * (currentPlayerPosition-rangeStart)/rangeEnd + '%' }"
        >
            <div class="current-play-position-label">
                {{ formatTimepoint(currentPlayerPosition) }}
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

@Component
export default class Timeline extends Vue {
    // Props
    @Prop()
    private look!: TimelineLook;

    @Prop({ type: Number })
    private rangeStart!: number;

    @Prop({ type: Number })
    private rangeEnd!: number;

    @Prop({ type: Number })
    private numberOfMarks!: number;

    @Prop({ type: Number })
    private currentPlayerPosition!: number;

    // Internal data members
    private isDraggingPlayPosition: boolean = false;

    // Public API
    public formatTimepoint(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        seconds -= hours * 3600;
        const minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;
        const leftOverSeconds = seconds;
        console.log(seconds, minutes, leftOverSeconds);
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
        this.isDraggingPlayPosition = true;
    }

    private onDragPlayPosition(event: DragEvent): void {
        if (this.isDraggingPlayPosition) {
            const rect = (this.$refs["timeline-container"] as HTMLElement).getBoundingClientRect();
            const offsetXAsPercentage = (event.clientX - rect.left) / rect.width;
            this.currentPlayerPosition = offsetXAsPercentage * (this.rangeEnd - this.rangeStart);
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
}
.current-play-position-label {
    padding-left: 0.5em;
}
</style>
