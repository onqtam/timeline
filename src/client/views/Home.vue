<template>
    <v-container style="height: 100%;">
        <v-row align="center" style="height: 100%" justify="center">
            <v-col cols="8" class="d-flex">
                <v-tooltip v-model="parseAlert" top color="red">
                    <template v-slot:activator="">
                        <v-text-field
                            id="youtubeTextField"
                            @focus=checkAndShowLoginDialog
                            @input="parseAlert=false"
                            v-model=youtubeUrl
                            label="Paste a URL to a YouTube video you'd like to play"
                            placeholder="https://www.youtube.com/watch?v=-k-ztNsBM54"
                            filled
                            autocomplete="off"
                            class="mr-3"
                            @keyup.enter=submit
                        />
                    </template>
                    <h2>{{alertText}}</h2>
                </v-tooltip>
                <v-btn x-large @click="submit">Submit</v-btn>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { parseYouTubeVideoIdFromUrl } from "@/logic/MiscHelpers";
import { Episode } from "@/logic/entities/Channel";
import store from "@/client/store";

@Component({
    components: {
    }
})
export default class HomeView extends Vue {
    youtubeUrl = "";
    parseAlert = false;
    alertText = "";

    submit(): void {
        if (this.checkAndShowLoginDialog()) {
            const parseResult = parseYouTubeVideoIdFromUrl(this.youtubeUrl);
            if (parseResult) {
                this.parseAlert = false;
                store.dispatch.channel.getYouTubeEpisode({ url: parseResult })
                    .then((episode: Episode) => {
                        this.$router.push("/play/" + episode.id);
                    }).catch((error: string) => {
                        this.alertText = error;
                        this.parseAlert = true;
                    });
            } else {
                this.parseAlert = true;
                this.alertText = "Not a valid YouTube video URL!";
            }
        }
    }

    // TODO: how to reuse this code with other components?
    checkAndShowLoginDialog(): boolean {
        if (store.state.user.info.isGuest) {
            // first unfocus (otherwise one would have to "escape" twice)
            (document.getElementById("youtubeTextField") as HTMLElement).blur();
            // and then on the next rendering frame show the login dialog - otherwise the unfocus wouldn't work
            this.$nextTick(() => {
                store.commit.user.setShowLoginDialog(true);
            });
            return false;
        }
        return true;
    }
}
</script>
