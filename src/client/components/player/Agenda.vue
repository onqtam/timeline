<template>
    <div class="d-inline-block" style="height: 50px;"> <!-- TODO: this height restriction is because it otherwise stretches vertically - don't know why -->
        <v-dialog v-model=showDialog scrollable max-width="700px">
            <template v-slot:activator="{ on, attrs }">
                <v-btn v-bind=attrs v-on=on><v-icon>mdi-playlist-play</v-icon>topics</v-btn>
            </template>
            <v-card>
                <v-card-title class="justify-center">All topics in episode</v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                    <v-list>
                        <v-list-item-group v-model=activeIndex active-class="blue--text">
                            <template v-for="(item, index) in agenda.items">
                                <v-list-item :key=item.timestamp.seconds :active=isAgendaItemActive(index)>
                                    <v-list-item-action>
                                        <v-list-item-action-text v-text=item.timestamp.format() />
                                    </v-list-item-action>
                                    <!-- TODO: CLAMP LENGTH OF TEXT -->
                                    <v-list-item-title>{{ item.text }}</v-list-item-title>
                                </v-list-item>
                                <v-progress-linear v-if="activeIndex == index" :value=computeProgressPercentage(index) :key="'progress_' + index"></v-progress-linear>
                                <v-divider v-if="index + 1 < agenda.items.length" :key="'divider_' + index"></v-divider>
                            </template>
                        </v-list-item-group>
                    </v-list>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions class="justify-center">
                    <v-btn color="blue darken-1" text @click="showDialog = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { AudioWindow } from "@/logic/AudioFile";
import Timepoint from "@/logic/entities/Timepoint";
import { Agenda } from "@/logic/entities/Episode";
import MathHelpers from "@/logic/MathHelpers";

import store from "@/client/store";

@Component
export default class AgendaComponent extends Vue {
    @Prop({ type: Timepoint })
    public currentAudioPosition!: Timepoint;
    @Prop({ type: Agenda })
    agenda!: Agenda;
    @Prop()
    public audioWindow?: AudioWindow;

    showDialog = false;

    get activeIndex(): number {
        for (let i = 0; i < this.agenda.items.length; i++) {
            if (this.isAgendaItemActive(i)) {
                return i;
            }
        }
        console.assert(false);
        return -1;
    }

    set activeIndex(index: number) {
        this.showDialog = false;
        if (index === undefined || index === this.activeIndex) {
            // can be undefined if we click the same element as the current one
            // or if we have undefined it once and then select the same as the previous current active index
            return;
        }
        this.$router.push("?t=" + this.agenda.items[index].timestamp.formatAsUrlParam());
        this.$emit("update:currentAudioPosition", this.agenda.items[index].timestamp.seconds);
    }

    // TODO: reuse code with Annotations
    isAgendaItemActive(itemIndex: number): boolean {
        return MathHelpers.isBetweenOpenEnded(store.state.play.audioPos.seconds,
            this.agenda.items[itemIndex].timestamp.seconds,
            this.agenda.items[itemIndex + 1]?.timestamp.seconds || Number.POSITIVE_INFINITY);
    }

    getEndOfItem(itemIndex: number): number {
        return itemIndex + 1 < this.agenda.items.length
            ? this.agenda.items[itemIndex + 1].timestamp.seconds
            : this.audioWindow!.audioFile.duration;
    }

    computeProgressPercentage(itemIndex: number): number {
        if (this.isAgendaItemActive(itemIndex)) {
            return 100 * (this.currentAudioPosition.seconds - this.agenda.items[itemIndex].timestamp.seconds) /
                (this.getEndOfItem(itemIndex) - this.agenda.items[itemIndex].timestamp.seconds);
        }
        return 0;
    }
}
</script>
