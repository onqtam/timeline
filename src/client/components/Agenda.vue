<template>
    <div class="agenda-container">
        <ul>
            <li v-for="(item, index) in agenda.items" :key=item.timestamp.seconds>
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
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import { Agenda } from "@/logic/Podcast";
import MathHelpers from "@/logic/MathHelpers";

import store from "@/client/store";

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

ul {
    list-style-type: none;
    text-align: left;
    margin: 0;
    padding: 0;
    overflow: auto;
    height: 100%;
}

li {
    line-height: 1.4em;
}

.agenda-container {
    border-style: dashed none;
    padding: 1em 0;
}

.agenda-item-active {
    color: @theme-focus-color;
}
</style>
