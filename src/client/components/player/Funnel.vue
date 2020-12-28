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
            <path stroke="black" id="funnel_fill" fill="url(#light_grad)"/>
            <path stroke="black" id="progress_fill" fill="url(#darker_grad)"/>
        </svg>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Timepoint from "@/logic/entities/Timepoint";
import { AudioWindow } from "@/logic/AudioFile";

@Component
export default class Funnel extends Vue {
    // Props
    // In seconds
    @Prop({ type: Number })
    public window_start!: number;
    // In seconds
    @Prop({ type: Number })
    public rangeEnd!: number;
    @Prop({ type: Timepoint })
    public currentAudioPosition!: Timepoint;
    @Prop()
    public audioWindow?: AudioWindow;

    private windowWidth = 0;
    // private window_start = 0;
    private window_end = 0;
    private midpoint_left = 0;
    private midpoint_right = 0;
    private static readonly totalHeight = 20; // should be the same as the viewBox height
    private static readonly midHeight = Funnel.totalHeight / 2;

    // these are for the fill of the playback progress within the funnel
    private progress_end = 0;
    private midpoint_fill = 0;
    private progress_bottom = 0;
    private progress = 0;
    private static readonly progress_mid_height = Funnel.midHeight * 1.3;

    private setVars(window_start_input: number, window_width_input: number, progress_input: number): void {
        this.windowWidth = window_width_input;
        this.window_start = window_start_input;
        this.window_end = this.window_start + this.windowWidth;
        this.midpoint_left = this.window_start / 2;
        this.midpoint_right = this.window_end + (1000 - (this.window_start + this.windowWidth)) / 2;
        // these are for the fill of the playback progress within the funnel
        this.progress = progress_input / 1000;
        this.progress_end = this.window_start + this.windowWidth * this.progress;
        this.progress_bottom = 1000 * this.progress;
        this.midpoint_fill = this.progress_bottom + (this.progress_end - this.progress_bottom) / 2;
    }

    private updatePaths() {
        const funnel_fill_attr = `M 0 ${Funnel.totalHeight}
            C 0 ${Funnel.midHeight} 0 ${Funnel.midHeight} ${this.midpoint_left} ${Funnel.midHeight}
            C ${this.window_start} ${Funnel.midHeight} ${this.window_start} ${Funnel.midHeight} ${this.window_start} 0
            L ${this.window_end} 0
            C ${this.window_end} ${Funnel.midHeight} ${this.window_end} ${Funnel.midHeight} ${this.midpoint_right} ${Funnel.midHeight}
            C 1000 ${Funnel.midHeight} 1000 ${Funnel.midHeight} 1000 ${Funnel.totalHeight}`;
        const progress_fill_attr = `M 0 ${Funnel.totalHeight} 
            C 0 ${Funnel.midHeight} 0 ${Funnel.midHeight} ${this.midpoint_left} ${Funnel.midHeight}
            C ${this.window_start} ${Funnel.midHeight} ${this.window_start} ${Funnel.midHeight} ${this.window_start} 0
            L ${this.progress_end} 0
            C ${this.progress_end} ${Funnel.progress_mid_height} ${this.progress_end} ${Funnel.progress_mid_height} ${this.midpoint_fill} ${Funnel.progress_mid_height}
            C ${this.progress_bottom} ${Funnel.progress_mid_height} ${this.progress_bottom} ${Funnel.progress_mid_height} ${this.progress_bottom} ${Funnel.totalHeight}`;

        (document.getElementById("funnel_fill") as HTMLElement).setAttribute("d", funnel_fill_attr);
        (document.getElementById("progress_fill") as HTMLElement).setAttribute("d", progress_fill_attr);
    }

    public mounted(): void {
        this.setVars(100, 30, 450);
        this.updatePaths();
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
}
</style>
