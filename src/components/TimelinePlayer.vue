<template>
  <div class="timeline-player">
    <audio nocontrols></audio>
    <Timeline
        :look=topTimelineLook :numberOfMarks=10
        :rangeStart=0 :rangeEnd=600
    >
    </Timeline>
    <Timeline
        ref="zoomline"
        :look=bottomZoomlineLook :numberOfMarks=10
        :rangeStart=zoomlineRangeStart() :rangeEnd=zoomlineRangeEnd()
    >
    </Timeline>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { default as Timeline, TimelineLook } from "./Timeline.vue";

@Component({
    components: { Timeline }
})
export default class TimelinePlayer extends Vue {
    // Props
    @Prop() private msg!: string;
    private zoomlineRangeStart(): number {
        return Math.floor(this.currentAudioPosition / 60) * 60;
    }
    private zoomlineRangeEnd(): number {
        return Math.floor(this.currentAudioPosition / 60 + 1) * 60;
    }
    private currentAudioPosition: number = 0;
    // These constants are necessary as we can't use the TimelineLook enum in the template above since
    // it's an external object and Vue doesn't let you access external objects in templates
    private topTimelineLook: TimelineLook = TimelineLook.Line;
    private bottomZoomlineLook: TimelineLook = TimelineLook.Audiowave;
};

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../cssresources/theme.less";

h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
