<template>
    <div class="chartist-chart"></div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import Chartist from "chartist";

export enum ChartType {
    Line,
    Bar
};

type AnyChartType = Chartist.IChartistLineChart | Chartist.IChartistBarChart;
type AnyChartOptions = Chartist.ILineChartOptions | Chartist.IBarChartOptions;
// A Chart component, currently powered by Chartist.js. This can change in the future of Chartist doesn't work for us.
@Component
export default class VChart extends Vue {
    @Prop({ type: Number })
    public type!: ChartType;

    @Prop({ type: Object })
    public data!: Chartist.IChartistData;

    @Prop({ type: Object })
    public options!: Chartist.IChartOptions;

    private chart!: AnyChartType;

    // Option generating getters
    private get lineOptions(): Chartist.ILineChartOptions {
        return {
            // Don't draw the line chart points
            showPoint: false,
            // X-Axis specific configuration
            axisX: {
                // We can disable the grid for this axis
                showGrid: false,
                // and also don't show the label
                showLabel: false
            },
            axisY: {
                // We can disable the grid for this axis
                showGrid: false,
                // and also don't show the label
                showLabel: false
            }
        };
    }

    private get chartOptions(): AnyChartOptions {
        const commonOptions = this.options;
        switch (this.type) {
        case ChartType.Line:
            return Object.assign(this.lineOptions, commonOptions);
        default:
            throw new Error("Should never be reached!");
        }
    }

    public buildChart(): void {
        switch (this.type) {
        case ChartType.Line:
            this.chart = new Chartist.Line(".chartist-chart", this.data, this.chartOptions);
            break;
        case ChartType.Bar:
            this.chart = new Chartist.Bar(".chartist-chart", this.data, this.chartOptions);
            break;
        }
    }

    public beforeUpdate(): void {
        this.buildChart();
    }

    public mounted(): void {
        this.buildChart();
    }
}

</script>

<style scoped lang="less">
@import "../../cssresources/theme.less";

</style>
