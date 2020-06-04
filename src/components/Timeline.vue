<template>
  <div class="timeline-container">
      <div class="mark" v-for="markTime in numberOfMarks + 1" :key="markTime">
            {{ ((markTime-1)/numberOfMarks) * (rangeEnd - rangeStart) }}
            <div class="vertical-line"></div>
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
    @Prop()
    private look!: TimelineLook;

    @Prop({ type: Number })
    private rangeStart!: number;

    @Prop({ type: Number })
    private rangeEnd!: number;

    @Prop({ type: Number })
    private numberOfMarks!: number;

    public functionToSilenceWarnings (): void {
      console.log(this.look === TimelineLook.Line);
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
    display: flex;
    justify-content: space-between;
}

.mark {
    display: fle;
}

.vertical-line {
    height: 30%;
    width: 10px;
    background: @theme-background;
}
</style>
