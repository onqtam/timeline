<template>
    <div class="channel-slot" :class="{ 'active-channel-slot': isReadingMore }">
        <div class="channel-thumbnail" :style="{ 'background-image': 'url(' + channel.imageURL +')' }" >
        </div>
        <div class="channel-content">
            <router-link :to="`/episodes/${channel.titleAsURL}`">
                <h3 class="channel-title">{{ channel.title }}</h3>
            </router-link>
            <span> {{ channel.author }}</span>
            <span class="separator"> · </span>
            <span>{{ channel.episodes.length }} Episodes</span>
            <br>
            <div class="channel-description" v-html=channelFilteredDescription>
            </div>
        </div>
        <v-btn class="read-more-button" @click=toggleMore>Read more</v-btn>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import Timepoint from "@/logic/entities/Timepoint";
import { Channel } from "@/logic/entities/Channel";

@Component({
    components: {
    }
})
export default class ChannelComponent extends Vue {
    @Prop({ type: Channel })
    public channel!: Channel;

    // TODO: Extract the "readmore" part which is duplicated here in the Episode component as a external component
    public get channelFilteredDescription(): string {
        // TODO: Redesign, this is a "on-top-of-the-head" implementation
        // Return everything if we are reading more
        if (this.isReadingMore) {
            return this.channel.description;
        }
        // 1. Create a dummy element
        // 2. Inject the HTML-enabled description
        // 3. Return only the first item
        const dummyDiv = document.createElement("div");
        dummyDiv.innerHTML = this.channel.description;
        return dummyDiv.children.length > 0 ? dummyDiv.children[0].outerHTML : dummyDiv.outerHTML;
    }
    public isReadingMore: boolean = false;

    public formatChannelDuration(duration: number): string {
        return new Timepoint(duration).format();
    }
    public toggleMore(): void {
        this.isReadingMore = !this.isReadingMore;
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.channel-slot {
    padding: 0;
    padding-bottom: 2.5em;
}
.channel-thumbnail, .channel-content {
    margin: 0;
    display: inline-block;
}
.channel-thumbnail {
    background-size: contain;
    background-position: top center;
    background-repeat: no-repeat;
    width: 20%;
    height: 100%;
    float: left;
}
.channel-content {
    text-align: left;
    padding-left: 1em;
    width: 80%;
    height: 100%;
    overflow: hidden;
}
.channel-title {
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
<!-- Unscoped CSS in order to style the channel description as it is dynamic html-->
<style lang="less">
.channel-description h1,
.channel-description h2,
.channel-description h3 {
    font-size: 1.2em;
}
</style>
