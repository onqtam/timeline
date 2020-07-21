<template>
    <div class="agenda-container">
        <hr>
        <ul v-for="(item, index) in agenda.items" :key=item.timestamp.seconds>
            <li>
                <router-link
                    class="agenda-item"
                    :class="{'agenda-item-active': isAgendaItemActive(index)}"
                    :to="'?t=' + item.timestamp.formatAsUrlParam()"
                >
                        {{ item.timestamp.format() }}
                        {{ item.text }}
                </router-link>
            </li>
        </ul>
        <hr>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import Timepoint from "@/logic/Timepoint";
import { Agenda, AgendaItem } from "@/logic/Podcast";
import MathHelpers from '../logic/MathHelpers';

import store from "@/store";

@Component
export default class AgendaComponent extends Vue {
    @Prop({ type: Agenda })
    public agenda!: Agenda;

    public isAgendaItemActive(itemIndex: number): boolean {
        return MathHelpers.isBetweenOpenEnded(store.state.listen.audioPos.seconds,
            this.agenda.items[itemIndex].timestamp.seconds,
            this.agenda.items[itemIndex + 1]?.timestamp.seconds || Number.POSITIVE_INFINITY);
    }

}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

hr {
    border-style: dashed;
}
ul {
    list-style-type: none;
    text-align: left;
}

.agenda-container {
    overflow-y: auto;
}

.agenda-item {
    line-height: 1.1em;
}
.agenda-item-active {
    color: @theme-focus-color;
}
</style>
