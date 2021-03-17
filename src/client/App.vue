<template>
    <v-app id="app" style="display: grid; justify-content: center;">
        <Navbar/>
        <v-main app>
            <!-- <v-container fluid>
                <v-row>
                    <v-col> -->
                        <router-view class="brown darken-4" style="width:100%; max-width: 1200px;"/>
                    <!-- </v-col>
                </v-row>
            </v-container> -->
        </v-main>

        <v-footer app>
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
