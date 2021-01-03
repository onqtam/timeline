<template>
    <div
        ref="annotations-container"
        class="annotations-container"
    >
        <div v-for="(item, index) in agenda.items" :key=item.timestamp.seconds class="annotation" :style="computeStyle(item, index)"/>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Timepoint from "@/logic/entities/Timepoint";
import { AudioWindow } from "@/logic/AudioFile";
import { Agenda, AgendaItem } from "@/logic/entities/Episode";
import MathHelpers from "@/logic/MathHelpers";

import store from "@/client/store";

@Component
export default class Annotations extends Vue {
    // Props
    @Prop({ type: Timepoint })
    public currentAudioPosition!: Timepoint;
    @Prop({ type: Agenda })
    public agenda!: Agenda;
    @Prop()
    public audioWindow?: AudioWindow;

    computeStyle(item: AgendaItem, itemIndex: number) {
        // the computation here assumes that there is always an entry in the agenda at timepoint 0
        const percent = 100 * ((itemIndex + 1 < this.agenda.items.length
            ? this.agenda.items[itemIndex + 1].timestamp.seconds
            : this.audioWindow!.audioFile.duration) -
                                item.timestamp.seconds) / this.audioWindow!.audioFile.duration;
        return "width: calc(" + percent + "% - 0.2em)";
    }

    public isAgendaItemActive(itemIndex: number): boolean {
        return MathHelpers.isBetweenOpenEnded(store.state.listen.audioPos.seconds,
            this.agenda.items[itemIndex].timestamp.seconds,
            this.agenda.items[itemIndex + 1]?.timestamp.seconds || Number.POSITIVE_INFINITY);
    }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
@import "../../cssresources/theme.less";

.annotations-container {
    width: 100%;
    background: green;

    display: flex;
    justify-content: space-around;
    height: 20px;
    padding-top: 5px;
    padding-bottom: 5px;
}

.annotation {
    background-color: rgb(255, 238, 5);
    transition: 300ms;
    height: 100%;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    height: 10px;
    cursor: pointer; /* Show we are clickable */
}

.annotation:hover {
    background-color: rgb(141, 132, 0);
    margin-top: -3px;
    height: 16px;
}

// .annotations-container .annotation:first-child {
//     border-top-left-radius: 6px;
//     border-bottom-left-radius: 6px;
// }

// .annotations-container .annotation:last-child {
//     border-top-right-radius: 6px;
//     border-bottom-right-radius: 6px;
// }

</style>
