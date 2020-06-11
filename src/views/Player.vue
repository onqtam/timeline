<template>
    <div>
        <TimelinePlayer :audio=audioFile :volume=0.15 />
        <CommentSection />
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import TimelinePlayer from "@/components/TimelinePlayer.vue";
import CommentSection from "@/components/CommentSection.vue";
import { default as AudioFile } from "@/logic/AudioFile";

@Component({
    components: {
        TimelinePlayer,
        CommentSection
    }
})
export default class PlayerView extends Vue {
    public audioFile!: AudioFile;

    constructor() {
        super();
        this.audioFile = new AudioFile();
        this.audioFile.filepath = "../assets/ShumiMarica.mp3";
        this.audioFile.duration = 153;
    }
}
</script>
