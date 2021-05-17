<template>
<!-- style="display: grid; justify-content: center;" -->
    <v-app>
        <Navbar/>
        <v-main app>
            <v-container style="padding: 0; height: 100%;">
                <!-- key is used so pages are re-rendered when path params change -->
                <router-view :key=$route.path class="grey darken-4" />
            </v-container>
        </v-main>

        <v-footer app absolute="true">
            @@@copyright
        </v-footer>
    </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import store from "./store";
import User from "@/logic/entities/User";
import Navbar from "./components/Navbar.vue";

@Component({
    components: {
        Navbar
    }
})
export default class App extends Vue {
    public beforeMount(): void {
        User.initSpecialUsers();
        store.dispatch.user.loadUser();
    }
}
</script>

<style lang="less">
@import "./cssresources/theme.less";
</style>
