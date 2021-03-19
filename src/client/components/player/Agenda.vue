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
                                <v-list-item :key=item.timestamp.seconds :active="agenda.isAgendaItemActive(index, audioPos)">
                                    <v-list-item-action>
                                        <v-list-item-action-text v-text=item.timestamp.format() />
                                    </v-list-item-action>
                                    <!-- TODO: CLAMP LENGTH OF TEXT -->
                                    <v-list-item-title>{{ item.text }}</v-list-item-title>
                                </v-list-item>
                                <v-progress-linear v-if="activeIndex == index" :value="agenda.computeProgressPercentage(index, audioPos, audioDuration)" :key="'progress_' + index"></v-progress-linear>
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
import Timepoint from "@/logic/entities/Timepoint";
import { AudioWindow } from "@/logic/AudioFile";
import { Agenda } from "@/logic/entities/Episode";

@Component
export default class AgendaComponent extends Vue {
    @Prop({ type: Number })
    public audioPos!: number;
    @Prop({ type: Agenda })
    agenda!: Agenda;
    @Prop()
    public audioWindow!: AudioWindow;

    get audioDuration(): number { return this.audioWindow!.audioFile.duration; }

    showDialog = false;

    get activeIndex(): number {
        for (let i = 0; i < this.agenda.items.length; i++) {
            if (this.agenda.isAgendaItemActive(i, this.audioPos)) {
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
        this.$router.push("?start=" + this.agenda.items[index].timestamp.formatAsUrlParam() + "&end=" + this.getEndOfItemAsTimepoint(index).formatAsUrlParam());
        this.$emit("update:animate");
    }

    getEndOfItemAsTimepoint(itemIndex: number): Timepoint {
        return new Timepoint(this.agenda.getEndOfItem(itemIndex, this.audioDuration));
    }
}
</script>
