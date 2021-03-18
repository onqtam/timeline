<template>
    <div class="episode-view-container">
        <EpisodeComponent class="episode-slot"
            v-for="episode in channel.episodes" :key=episode.title
            :channel=channel :episode=episode
        >
        </EpisodeComponent>
        <hr>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import store from "@/client/store";

import { Channel } from "@/logic/entities/Channel";

import EpisodeComponent from "@/client/components/Episode.vue";

const beforeRouteChange = (to: Route, from: Route, next: NavigationGuardNext<EpisodesView>, existingView: EpisodesView|undefined) => {
    const channelId = ~~to.params.channelId;
    console.assert(channelId !== undefined);

    const displayPage = () => {
        // Important p.title === channelTitle only works because Vue router automatically decodes the URL
        const channel: Channel|undefined = store.state.channel.allChannels.find(p => p.id === channelId);
        // TODO: handle not found case
        // TODO: handle data not yet loaded case
        if (existingView) {
            Object.assign(existingView.channel, channel);
        } else {
            next(view => {
                Object.assign(view.channel, channel);
            });
        }
    };
    store.dispatch.channel.initChannelData().then(displayPage);
};

@Component({
    components: {
        EpisodeComponent
    },
    beforeRouteEnter(to: Route, from: Route, next: NavigationGuardNext<EpisodesView>): void {
        beforeRouteChange(to, from, next, undefined);
    },
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<EpisodesView>): void {
        beforeRouteChange(to, from, next, this);
    }
})
export default class EpisodesView extends Vue {
    public channel: Channel = new Channel();
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.episode-view-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    overflow: auto;
    padding: 0 2.5em;
    height: 100%;
}
.episode-slot {
    width: 100%;
    margin-bottom: 2.5em;
    border-bottom: 2px solid @theme-focus-color-4;
}

.active-episode-slot {
    flex-grow: 10;
}
</style>
