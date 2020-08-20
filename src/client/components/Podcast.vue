<template>
    <div class="podcast-slot" :class="{ 'active-podcast-slot': isReadingMore }">
        <div class="podcast-thumbnail" :style="{ 'background-image': 'url(' + podcast.imageURL +')' }" >
        </div>
        <div class="podcast-content">
            <router-link :to="`/episodes/${podcast.titleAsURL}`">
                <h3 class="podcast-title">{{ podcast.title }}</h3>
            </router-link>
            <span> {{ podcast.author }}</span>
            <span class="separator"> · </span>
            <span>{{ podcast.episodes.length }} Episodes</span>
            <br>
            <div class="podcast-description" v-html=podcastFilteredDescription>
            </div>
        </div>
        <VButton class="read-more-button" @click=toggleMore>Read more</VButton>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import Timepoint from "@/logic/entities/Timepoint";
import { Podcast } from "@/logic/entities/Podcast";

import VButton from "@/client/components/primitives/VButton.vue";

@Component({
    components: {
        VButton
    }
})
export default class PodcastComponent extends Vue {
    @Prop({ type: Podcast })
    public podcast!: Podcast;

    // TODO: Extract the "readmore" part which is duplicated here in the Episode component as a external component
    public get podcastFilteredDescription(): string {
        // TODO: Redesign, this is a "on-top-of-the-head" implementation
        // Return everything if we are reading more
        if (this.isReadingMore) {
            return this.podcast.description;
        }
        // 1. Create a dummy element
        // 2. Inject the HTML-enabled description
        // 3. Return only the first item
        const dummyDiv = document.createElement("div");
        dummyDiv.innerHTML = this.podcast.description;
        return dummyDiv.children.length > 0 ? dummyDiv.children[0].outerHTML : dummyDiv.outerHTML;
    }
    public isReadingMore: boolean = false;

    public formatPodcastDuration(duration: number): string {
        return new Timepoint(duration).format();
    }
    public toggleMore(): void {
        this.isReadingMore = !this.isReadingMore;
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.podcast-slot {
    box-sizing: border-box;
    padding: 0;
    padding-bottom: 2.5em;
}
.podcast-thumbnail, .podcast-content {
    margin: 0;
    display: inline-block;
    box-sizing: border-box;
}
.podcast-thumbnail {
    background-size: contain;
    background-position: top center;
    background-repeat: no-repeat;
    width: 20%;
    height: 100%;
    float: left;
}
.podcast-content {
    text-align: left;
    padding-left: 1em;
    width: 80%;
    height: 100%;
    overflow: hidden;
}
.podcast-title {
    margin-top: 0;
}
.separator {
    color: @theme-neutral-color;
}
.read-more-button {
    background: none;
    color: @theme-text-color;
    text-decoration: underline;
    float: right;
}
</style>
<!-- Unscoped CSS in order to style the podcast description as it is dynamic html-->
<style lang="less">
.podcast-description h1,
.podcast-description h2,
.podcast-description h3 {
    font-size: 1.2em;
}
</style>
