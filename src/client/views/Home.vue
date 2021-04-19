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
                        id="youtubeTextField"
                        @focus=checkAndShowLoginDialog
                        v-model=youtubeUrl
                        label="Paste a URL to a YouTube video you'd like to play"
                        placeholder="https://www.youtube.com/watch?v=-k-ztNsBM54"
                        filled
                        autocomplete="off"
                        @keyup.enter=submit
                    />
                    <v-btn @click="submit">Submit</v-btn>
                    <v-alert v-model=parseAlert color="red" dismissible type="error">
                        {{alertText}}
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
    alertText = "";

    submit(): void {
        if (this.checkAndShowLoginDialog()) {
            const parseResult = parseYouTubeVideoIdFromUrl(this.youtubeUrl);
            if (parseResult) {
                this.parseAlert = false;
                store.dispatch.channel.getYouTubeEpisode({ url: parseResult })
                    .then(episode => {
                        this.$router.push("/play/" + (episode as any).id);
                    }).catch(error => {
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
