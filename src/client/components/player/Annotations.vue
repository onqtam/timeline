<template>
    <div
        ref="annotations-container"
        class="annotations-container"
        v-if="agenda.items.length > 0"
    >
        <v-tooltip top v-for="(item, index) in agenda.items" :key=item.timestamp.seconds transition="fade-transition">
            <template v-slot:activator="{ on }">
                <!-- <router-link
                    v-on="on" class="annotation" :style="computeStyle(item, index)"
                    :to="'?t=' + item.timestamp.formatAsUrlParam()"
                > -->
                <div v-on="on" class="annotation" :style="computeStyle(item, index)">
                    <!-- TODO: because of this v-if there is flickering when transitioning from one agenda item to the next.
                    The problem is that this item first disappears and only then does isAgendaItemCompleted in computeStyle return true. -->
                    <div v-if="isAgendaItemActive(index)" :style="computeActiveItemProgressStyle(item, index)"/>
                </div>
                <!-- </router-link> -->
            </template>
            <!-- TODO: CLAMP LENGTH OF TEXT -->
            <span>{{item.text}}</span>
        </v-tooltip>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Timepoint from "@/logic/entities/Timepoint";
import { AudioWindow } from "@/logic/AudioFile";
import { Agenda, AgendaItem } from "@/logic/entities/Episode";
import MathHelpers from "@/logic/MathHelpers";

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
        const percentOfTotalEpiside = 100 * ((itemIndex + 1 < this.agenda.items.length
            ? this.agenda.items[itemIndex + 1].timestamp.seconds
            : this.audioWindow!.audioFile.duration) -
                                item.timestamp.seconds) / this.audioWindow!.audioFile.duration;
        const color = this.isAgendaItemCompleted(itemIndex) ? "red" : "yellow";
        return "width: calc(" + percentOfTotalEpiside + "% - 0.2em); background: " + color;
    }

    computeActiveItemProgressStyle(item: AgendaItem, itemIndex: number) {
        // TODO: sadly this computation doesn't account for the gaps so when near the
        // end the coloring doesn't 100% align with the progress bar on the timeline
        const percent = 100 * (this.currentAudioPosition.seconds - item.timestamp.seconds) /
            (this.getEndOfItem(itemIndex) - item.timestamp.seconds);
        return "background: red; height: 100%; width: " + percent + "%;";
    }

    getEndOfItem(itemIndex: number): number {
        return itemIndex + 1 < this.agenda.items.length
            ? this.agenda.items[itemIndex + 1].timestamp.seconds
            : this.audioWindow!.audioFile.duration;
    }

    isAgendaItemActive(itemIndex: number): boolean {
        return MathHelpers.isBetweenOpenEnded(this.currentAudioPosition.seconds,
            this.agenda.items[itemIndex].timestamp.seconds,
            this.agenda.items[itemIndex + 1]?.timestamp.seconds || Number.POSITIVE_INFINITY);
    }

    isAgendaItemCompleted(itemIndex: number): boolean {
        return this.currentAudioPosition.seconds >= this.getEndOfItem(itemIndex);
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
    cursor: pointer;

    &:hover {
        background-color: rgb(141, 132, 0);
        margin-top: -3px;
        height: 16px;
    }
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
