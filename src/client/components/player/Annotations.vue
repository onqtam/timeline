<template>
    <div
        ref="annotations-container"
        class="annotations-container"
        v-if="agenda.items.length > 0"
    >
        <v-tooltip top v-for="(item, index) in agenda.items" :key=item.timestamp.seconds transition="fade-transition">
            <template v-slot:activator="{ on }">
                <router-link
                    class="annotation" :style="computeBarStyle(item, index)"
                    :to="'?start=' + item.timestamp.formatAsUrlParam() + '&end=' + getEndOfItemAsTimepoint(index).formatAsUrlParam()"
                >
                    <!-- this outer 100% sized div is necessary for the tooltips - sticking the `v-on="on"` on the `router-link` doesn't work -->
                    <div v-on="on" style="width: 100%; height: 100%;">
                        <div :style="computeProgressStyle(item, index)"/>
                    </div>
                </router-link>
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

    computeBarStyle(item: AgendaItem, itemIndex: number) {
        // the computation here assumes that there is always an entry in the agenda at timepoint 0
        const percentOfTotalEpiside = 100 * ((itemIndex + 1 < this.agenda.items.length
            ? this.agenda.items[itemIndex + 1].timestamp.seconds
            : this.audioWindow!.audioFile.duration) -
                                item.timestamp.seconds) / this.audioWindow!.audioFile.duration;
        const color = this.isAgendaItemCompleted(itemIndex) ? "red" : "yellow";
        return "width: calc(" + percentOfTotalEpiside + "% - 0.2em); background: " + color;
    }

    computeProgressStyle(item: AgendaItem, itemIndex: number) {
        // TODO: sadly this computation doesn't account for the gaps so when near the
        // end the coloring doesn't 100% align with the progress bar on the timeline
        let percent = 0;
        if (this.isAgendaItemActive(itemIndex) || this.isAgendaItemCompleted(itemIndex)) {
            percent = 100 * (this.currentAudioPosition.seconds - item.timestamp.seconds) /
                (this.getEndOfItem(itemIndex) - item.timestamp.seconds);
        }
        return "background: red; height: 100%; width: " + percent + "%;";
    }

    getEndOfItem(itemIndex: number): number {
        return itemIndex + 1 < this.agenda.items.length
            ? this.agenda.items[itemIndex + 1].timestamp.seconds
            : this.audioWindow!.audioFile.duration;
    }

    getEndOfItemAsTimepoint(itemIndex: number): Timepoint {
        return new Timepoint(this.getEndOfItem(itemIndex));
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
