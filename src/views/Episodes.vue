<template>
    <div class="episode-view-container">
        <EpisodeComponent class="episode-slot"
            v-for="episode in podcast.episodes" :key=episode.title
            :episode=episode>
        </EpisodeComponent>
        <hr>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";

import AsyncLoader from "@/logic/AsyncLoader";
import { Podcast } from "@/logic/Podcast";

import VButton from "@/components/primitives/VButton.vue";
import EpisodeComponent from "@/components/Episode.vue";

const beforeRouteChange = (to: Route, from: Route, next: NavigationGuardNext<EpisodesView>, existingView: EpisodesView|undefined) => {
    const podcastTitle = to.params.podcastTitle as string;
    console.assert(podcastTitle !== undefined);
    const PODCAST_TO_RSS: Record<string, string> = {
        "the-portal": "https://rss.art19.com/the-portal"
    };
    const rssUrl: string|undefined = PODCAST_TO_RSS[podcastTitle];
    if (!rssUrl) {
        // TODO: Report error in a better way
        console.error("Unknown podcast!");
        return;
    }
    const onFetchFailed = () => {
        console.error("Invalid podcast!", podcastTitle);
    };
    const onFetchSuccessful = function (view: EpisodesView, rssContent: string) {
        const parsedPodcast: Podcast | null = Podcast.parsePodcastFromRSS(rssContent);
        if (parsedPodcast) {
            Object.assign(view.podcast, parsedPodcast);
        } else {
            onFetchFailed();
        }
    };
    const loadPromise = AsyncLoader.fetchTextFile(rssUrl);
    if (!existingView) {
        next((view: EpisodesView) => {
            loadPromise
                .then(onFetchSuccessful.bind(undefined, view), onFetchFailed);
        });
    } else {
        loadPromise
            .then(onFetchSuccessful.bind(undefined, existingView), onFetchFailed)
            .finally(next);
    }
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
