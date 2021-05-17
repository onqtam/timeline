<template>
    <v-container style="height: 100%;">
        <v-row align="center" style="height: 100%" justify="center">
            <v-col cols="8" class="d-flex">
                <v-tooltip
                    top
                    v-model="parseAlert"
                    color="red"
                    transition="none"
                >
                    <template v-slot:activator="">
                        <v-text-field
                            id="youtubeTextField"
                            @focus=checkAndShowLoginDialog
                            @input="parseAlert=false"
                            v-model=youtubeUrl
                            label="Paste a URL to a YouTube video you'd like to play"
                            placeholder="Example: https://www.youtube.com/watch?v=-k-ztNsBM54"
                            filled
                            autocomplete="off"
                            class="mr-3"
                            @keyup.enter=submit
                        />
                    </template>
                    <h2 :class="{'shake' : animatedAlert}">{{alertText}}</h2>
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
    animatedAlert= false;

    triggerAlert(text: string): void {
        this.alertText = text;
        this.parseAlert = true;
        this.animatedAlert = true;
        setTimeout(() => { this.animatedAlert = false; }, 1000);
    }

    submit(): void {
        if (this.checkAndShowLoginDialog()) {
            const parseResult = parseYouTubeVideoIdFromUrl(this.youtubeUrl);
            if (parseResult) {
                this.parseAlert = false;
                store.dispatch.channel.getYouTubeEpisode({ url: parseResult })
                    .then((episode: Episode) => {
                        this.$router.push("/play/" + episode.id);
                    }).catch((error: string) => {
                        this.triggerAlert(error);
                    });
            } else {
                this.triggerAlert("Not a valid YouTube video URL!");
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

<style scoped lang="less">
// taken from here: https://codepen.io/aut0maat10/pen/ExaNZNo
.shake {
    animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
    transform: translate3d(0, 0, 0);
}
@keyframes shake {
    10%, 90% {
        transform: translate3d(-1px, 0, 0);
    }
    20%, 80% {
        transform: translate3d(2px, 0, 0);
    }
    30%, 50%, 70% {
        transform: translate3d(-4px, 0, 0);
    }
    40%, 60% {
        transform: translate3d(4px, 0, 0);
    }
}
</style>
