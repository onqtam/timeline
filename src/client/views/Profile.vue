<template>
    <div>
        <h2>Your profile</h2>
        <div class="info">
            <label class="key">Displayed name</label>
            <label class="value">{{ user.shortName}}</label>
            <label class="key">Email</label>
            <label class="value">{{ user.email}}</label>
        </div>
        <div class="slider-controls">
            <label>Number Of Timeslots</label>
            <v-slider class="timeslot-count-slider" min=1 max=5 step=1 thumb-label="always" v-model=audioWindowTimeslotCount></v-slider>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

import store from "../store";
import User from "../../logic/entities/User";
import UserSettings, { ValueLimits } from "../../logic/entities/UserSettings";
import { NavigationGuardNext, Route } from "vue-router";

@Component({
    components: {
    },
    beforeRouteLeave: function (to: Route, from: Route, next: NavigationGuardNext<ProfileView>) {
        store.dispatch.user.saveSettings();
        next();
    }
})
export default class ProfileView extends Vue {
    public get user(): User {
        return store.state.user.info;
    }
    public get audioWindowTimeslotCount(): number {
        return store.state.user.info.settings.audioWindowTimeslotCount;
    }
    public set audioWindowTimeslotCount(value: number) {
        const payload = { key: "audioWindowTimeslotCount", value };
        store.commit.user.localSetSettingValue(payload);
    }
    public get timeslotCountLimits(): ValueLimits {
        return UserSettings.TIMESLOT_LIMITS;
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

.info {
    text-align: left;
    margin: 0 45%;
}

.key {
    display: block;
    font-weight: bold;
    margin-bottom: 0.35em;
}

.value {
    margin-left: 3em;
    color: @theme-neutral-color;
}

</style>
