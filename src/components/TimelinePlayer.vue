<template>
  <div class="timeline-player">
    <audio nocontrols></audio>
    <Timeline look={TimelineLook.Line} numberOfMarks=10 rangeStart=0 rangeEnd=60></Timeline>
    <Timeline look={TimelineLook.Audiowave} numberOfMarks=10 rangeStart=0 rangeEnd=60></Timeline>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { default as Timeline, TimelineLook } from "./Timeline.vue";

@Component({
  components: { Timeline }
})
export default class TimelinePlayer extends Vue {
    @Prop() private msg!: string;
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
