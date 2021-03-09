<template>
    <div>
        <v-container>
            <v-row class="justify-center">
                <v-col
                    cols="12"
                    sm="6"
                    md="6"
                >
                    <v-text-field
                        v-model=youtubeUrl
                        label="Paste a URL to a YouTube video you'd like to play"
                        placeholder="https://www.youtube.com/watch?v=-k-ztNsBM54"
                        filled
                        autocomplete="off"
                        @keyup.enter='submit'
                    ></v-text-field>
                    <v-btn @click="submit">Submit</v-btn>
                    <v-alert v-model=parseAlert color="red" dismissible type="error">
                      Not a valid YouTube URL!
                    </v-alert>
                </v-col>
            </v-row>
      </v-container>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { parseYouTubeVideoIdFromUrl } from "@/logic/MiscHelpers";
import store from "@/client/store";

@Component({
    components: {
    }
})
export default class HomeView extends Vue {
    youtubeUrl = "";
    parseAlert = false;

    submit() {
        let parseResult = parseYouTubeVideoIdFromUrl(this.youtubeUrl);
        if (parseResult) {
            this.parseAlert = false;
            store.dispatch.channel.getYouTubeEpisode({ url: parseResult })
            .then(episode => {
                console.assert(episode, "No such episode exists!");
                this.$router.push("/play/" + episode!.id);
            });
        } else {
            this.parseAlert = true;
        }
    }
}
</script>
