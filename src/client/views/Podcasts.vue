<template>
    <div class="podcast-view-container">
        <PodcastComponent class="podcast-slot"
            v-for="podcast in podcasts" :key=podcast.title
            :podcast=podcast
        >
        </PodcastComponent>
        <hr>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Route, NavigationGuardNext } from "vue-router";
import store from "@/client/store";

import { Podcast } from "@/logic/entities/Podcast";

import PodcastComponent from "@/client/components/Podcast.vue";

@Component({
    components: {
        PodcastComponent
    },
    beforeRouteEnter(to: Route, from: Route, next: NavigationGuardNext<PodcastsView>) {
        store.dispatch.podcast.initPodcastData().finally(next);
    }
})
export default class PodcastsView extends Vue {
    public get podcasts(): Podcast[] {
        return store.state.podcast.allPodcasts;
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.podcast-view-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    overflow: auto;
    padding: 0 2.5em;
    height: 100%;
}
.podcast-slot {
    width: 100%;
    margin-bottom: 2.5em;
    border-bottom: 2px solid @theme-focus-color-4;
}

.active-podcast-slot {
    flex-grow: 10;
}
</style>
