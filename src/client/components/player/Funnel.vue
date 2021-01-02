<template>
    <div
        ref="funnel-container"
        class="funnel-container"
    >
        <!-- the "canvas" for the svg drawing has a height of 20 and a width of 1000 for easy math and
        currently the height of the window is capped, while still being able to stretch horizontally -->
        <!-- use this resource to make some curves: https://codepen.io/anthonydugois/pen/mewdyZ -->
        <!-- read this on scaling svg graphics (ratios, viewbox, etc.): https://css-tricks.com/scale-svg/ -->
        <!-- here's a link to example static values for the funnels: https://jsfiddle.net/n9j5rst8/ -->
        <!-- this is a full working solution with 3 sliders: https://jsfiddle.net/oL9xw7tp/ -->

        <svg id="funnel" viewBox="0 1 1000 20" preserveAspectRatio="none">
            <defs>
                <linearGradient id="light_grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:rgb(190,190,210);stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:rgb(235,235,255);stop-opacity:1"/>
                </linearGradient>
                <linearGradient id="darker_grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:rgb(100,100,145);stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:rgb(200,200,225);stop-opacity:1"/>
                </linearGradient>
            </defs>
            <path stroke="black" fill="url(#light_grad)" :d="funnel_fill"/>
            <path stroke="black" fill="url(#darker_grad)" :d="progress_fill"/>
        </svg>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Timepoint from "@/logic/entities/Timepoint";
import MathHelpers from "@/logic/MathHelpers";

@Component
export default class Funnel extends Vue {
    // Props
    @Prop({ type: Number })
    public duration_full!: number;
    @Prop({ type: Number })
    public rangeStart_full!: number;
    @Prop({ type: Number })
    public rangeEnd_full!: number;
    @Prop({ type: Timepoint })
    public currentAudioPosition_full!: Timepoint;

    private get normalizeRatio() { return this.duration_full / 1000; } // because the viewBox has a drawing width of 1000

    private get duration() { return this.duration_full / this.normalizeRatio; }
    private get rangeStart() { return this.rangeStart_full / this.normalizeRatio; }
    private get rangeEnd() { return this.rangeEnd_full / this.normalizeRatio; }
    private get currentAudioPosition() { return this.currentAudioPosition_full.seconds / this.normalizeRatio; }

    private get windowWidth() { return this.rangeEnd - this.rangeStart; }
    private get midpoint_left() { return this.rangeStart / 2; }
    private get midpoint_right() { return this.rangeEnd + (this.duration - (this.rangeStart + this.windowWidth)) / 2; }

    private static readonly totalHeight = 20; // should be the same as the viewBox height
    private static readonly midHeight = Funnel.totalHeight / 2;

    private get progress() { return MathHelpers.percentageOfRange(this.currentAudioPosition, this.rangeStart, this.rangeEnd); }
    private get progress_end() { return this.rangeStart + this.windowWidth * this.progress; }
    private get progress_bottom() { return this.duration * this.progress; }
    private get midpoint_fill() { return this.progress_bottom + (this.progress_end - this.progress_bottom) / 2; }

    private static readonly progress_mid_height = Funnel.midHeight * 1.3;

    private get funnel_fill() {
        return `M 0 ${Funnel.totalHeight}
            C 0 ${Funnel.midHeight} 0 ${Funnel.midHeight} ${this.midpoint_left} ${Funnel.midHeight}
            C ${this.rangeStart} ${Funnel.midHeight} ${this.rangeStart} ${Funnel.midHeight} ${this.rangeStart} 0
            L ${this.rangeEnd} 0
            C ${this.rangeEnd} ${Funnel.midHeight} ${this.rangeEnd} ${Funnel.midHeight} ${this.midpoint_right} ${Funnel.midHeight}
            C ${this.duration} ${Funnel.midHeight} ${this.duration} ${Funnel.midHeight} ${this.duration} ${Funnel.totalHeight}
        `;
    }

    private get progress_fill() {
        // we don't want any progress fill if the cursor is outside of the window => return empty path
        if (this.currentAudioPosition_full.seconds < this.rangeStart_full ||
            this.currentAudioPosition_full.seconds > this.rangeEnd_full) {
            return "";
        }
        return `M 0 ${Funnel.totalHeight} 
            C 0 ${Funnel.midHeight} 0 ${Funnel.midHeight} ${this.midpoint_left} ${Funnel.midHeight}
            C ${this.rangeStart} ${Funnel.midHeight} ${this.rangeStart} ${Funnel.midHeight} ${this.rangeStart} 0
            L ${this.progress_end} 0
            C ${this.progress_end} ${Funnel.progress_mid_height} ${this.progress_end} ${Funnel.progress_mid_height} ${this.midpoint_fill} ${Funnel.progress_mid_height}
            C ${this.progress_bottom} ${Funnel.progress_mid_height} ${this.progress_bottom} ${Funnel.progress_mid_height} ${this.progress_bottom} ${Funnel.totalHeight}
        `;
    }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

.funnel-container {
    width: 100%;
}

#funnel {
    height: 1.5em;
    width: 100%;
    margin-bottom: -5px; // TODO why is this necessary?
}

#funnel path {
    transition: @player-transition-time;
}
</style>
