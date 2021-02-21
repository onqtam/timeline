<template>
    <div class="episode-slot" :class="{ 'active-episode-slot': isReadingMore }">
        <v-img class="episode-thumbnail" :src=episode.imageURL>
        </v-img>
        <div class="episode-content">
            <router-link :to="`/play/${channel.titleAsURL}/${episode.titleAsURL}`">
                <h3 class="episode-title">{{ episode.title }}</h3>
            </router-link>
            <span> {{ episode.publicationDate.toLocaleDateString() }}</span>
            <span class="separator"> · </span>
            <span> Duration: {{ formatEpisodeDuration(episode.durationInSeconds) }}</span>
            <br>
            <div class="episode-description" v-html=episodeFilteredDescription>
            </div>
        </div>
        <v-btn class="read-more-button" @click=toggleMore>Read more</v-btn>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import Timepoint from "@/logic/entities/Timepoint";
import { Episode, Channel } from "@/logic/entities/Channel";

@Component({
    components: {
    }
})
export default class EpisodeComponent extends Vue {
    @Prop({ type: Episode })
    public episode!: Episode;
    @Prop({ type: Channel })
    public channel!: Channel;

    public get episodeFilteredDescription(): string {
        // TODO: Redesign, this is a "on-top-of-the-head" implementation
        // Return everything if we are reading more
        if (this.isReadingMore) {
            return this.episode.description;
        }
        // 1. Create a dummy element
        // 2. Inject the HTML-enabled description
        // 3. Return only the first item
        const dummyDiv = document.createElement("div");
        dummyDiv.innerHTML = this.episode.description;
        return dummyDiv.children.length > 0 ? dummyDiv.children[0].outerHTML : dummyDiv.outerHTML;
    }
    public isReadingMore: boolean = false;

    public formatEpisodeDuration(duration: number): string {
        return new Timepoint(duration).format();
    }
    public toggleMore(): void {
        this.isReadingMore = !this.isReadingMore;
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.episode-slot {
    padding: 0;
    padding-bottom: 2.5em;
}
.episode-thumbnail, .episode-content {
    margin: 0;
    display: inline-block;
}
.episode-thumbnail {
    background-size: contain;
    background-position: top center;
    background-repeat: no-repeat;
    width: 20%;
    height: 100%;
    float: left;
}
.episode-content {
    text-align: left;
    padding-left: 1em;
    width: 80%;
    height: 100%;
    overflow: hidden;
}
.episode-title {
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
<!-- Unscoped CSS in order to style the episode description as it is dynamic html-->
<style lang="less">
.episode-description h1,
.episode-description h2,
.episode-description h3 {
    font-size: 1.2em;
}
</style>
