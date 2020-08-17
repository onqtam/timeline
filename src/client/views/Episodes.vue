<template>
    <div class="episode-view-container">
        <EpisodeComponent class="episode-slot"
            v-for="episode in podcast.episodes" :key=episode.title
            :podcast=podcast :episode=episode
        >
        </EpisodeComponent>
        <hr>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import store from "@/client/store";

import { Podcast } from "@/logic/entities/Podcast";

import VButton from "@/client/components/primitives/VButton.vue";
import EpisodeComponent from "@/client/components/Episode.vue";

const beforeRouteChange = (to: Route, from: Route, next: NavigationGuardNext<EpisodesView>, existingView: EpisodesView|undefined) => {
    const podcastTitle = to.params.podcastTitle as string;
    console.assert(podcastTitle !== undefined);
    // TODO: This is a hack because the data in the store might not be loaded yet
    // Continiously retry and wait for it to be loaded until some limit
    const timeLimit = 5000;
    const timeAtStart = new Date();
    const checkIfPodcastDataIsLoaded = () => {
        const podcast: Podcast = store.state.podcast.allPodcasts[podcastTitle];
        const timeSpentTrying = (new Date().getTime() - timeAtStart.getTime());
        if (!podcast || timeSpentTrying <= timeLimit) {
            setTimeout(checkIfPodcastDataIsLoaded, 16);
            return;
        }
        if (existingView) {
            Object.assign(existingView.podcast, podcast);
        } else {
            next(view => Object.assign(view.podcast, podcast));
        }
    };
    checkIfPodcastDataIsLoaded();
};

@Component({
    components: {
        VButton,
        EpisodeComponent
    },
    beforeRouteEnter(to: Route, from: Route, next: NavigationGuardNext<EpisodesView>) {
        beforeRouteChange(to, from, next, undefined);
    },
    beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<EpisodesView>) {
        beforeRouteChange(to, from, next, this);
    }
})
export default class EpisodesView extends Vue {
    public podcast: Podcast = new Podcast();
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
