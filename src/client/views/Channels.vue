<template>
    <div class="channel-view-container">
        <ChannelComponent class="channel-slot"
            v-for="channel in channels" :key=channel.title
            :channel=channel
        >
        </ChannelComponent>
        <hr>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import store from "@/client/store";

import { Channel } from "@/logic/entities/Channel";

import ChannelComponent from "@/client/components/Channel.vue";

@Component({
    components: {
        ChannelComponent
    },
    beforeRouteEnter(to: Route, from: Route, next: NavigationGuardNext<ChannelsView>) {
        store.dispatch.channel.initChannelData().finally(next);
    }
})
export default class ChannelsView extends Vue {
    public get channels(): Channel[] {
        return store.state.channel.allChannels;
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.channel-view-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    overflow: auto;
    padding: 0 2.5em;
    height: 100%;
}
.channel-slot {
    width: 100%;
    margin-bottom: 2.5em;
    border-bottom: 2px solid @theme-focus-color-4;
}

.active-channel-slot {
    flex-grow: 10;
}
</style>
