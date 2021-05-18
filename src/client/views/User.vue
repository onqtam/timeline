<template>
    <div>
        <!-- TODO: add v-if -->
        <h2>Your profile</h2>
        <div>
            <label>Displayed name: </label>
            <label>{{ user.shortName}}</label>
            <br/>
            <label>Email: </label>
            <label>{{ user.email}}</label>
        </div>
        <div class="slider-controls">
            <!-- <label>Number Of Timeslots</label>
            <v-slider class="timeslot-count-slider" min=1 max=5 step=1 thumb-label="always" v-model=audioWindowTimeslotCount/> -->
        </div>
        <router-link v-for="(comment, index) in comments" :key=index
            :to="`/play/${comment.episodeId}?t=${comment.start.formatAsUrlParam()}&thread=${comment.id}`">
                <CommentComponent
                    :comment=comment
                    :parentThread=null
                    :shouldShowOnlyPreview=false
                />
        </router-link>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import store from "../store";
import User from "../../logic/entities/User";
import Comment from "@/logic/entities/Comments";
import { NavigationGuardNext, Route } from "vue-router";
import CommentComponent from "../components/comments/Comment.vue";

@Component({
    components: {
        CommentComponent
    },
    beforeRouteLeave: function (to: Route, from: Route, next: NavigationGuardNext<UserView>): void {
        store.dispatch.user.saveSettings();
        next();
    }
})
export default class UserView extends Vue {
    @Prop({ type: Number })
    public userId!: number;

    public get user(): User {
        return store.state.user.info;
    }
    // public set audioWindowTimeslotCount(value: number) {
    //     const payload = { key: "audioWindowTimeslotCount", value };
    //     store.commit.user.localSetSettingValue(payload);
    // }

    comments: Comment[] = [];

    created(): void {
        store.dispatch.user.loadUserComments({ userId: this.userId }).then((comments: Comment[]) => {
            this.comments = comments;
        });
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.slider-controls {
    width: 20%;
    display: block;
    margin: 0 40%;
    margin-top: 3em;
}

</style>
