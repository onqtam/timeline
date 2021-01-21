<template>
    <v-app id="app" style="display: grid; justify-content: center;">
        <v-app-bar app>
            <v-tabs
                centered
                class="ml-n9"
                color="grey darken-1"
            >
                <v-tab to="/">Home</v-tab>
                <v-tab to="/about">About</v-tab>
                <v-tab to="/profile">Profile</v-tab>
                <v-tab @click=login>Login</v-tab>
            </v-tabs>
        </v-app-bar>

        <v-main app>
            <!-- <v-container fluid>
                <v-row>
                    <v-col> -->
                        <!-- <LoginModal ref="login"></LoginModal> -->
                        <router-view class="brown darken-4" style="width:1000px;"/>
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
import LoginModal from "@/client/views/Login.vue";
import store from "./store";
import User from "@/logic/entities/User";

@Component({
    components: {
        LoginModal
    }
})
export default class App extends Vue {
    public beforeMount(): void {
        User.initSpecialUsers();
        store.dispatch.user.loadUser();
    }

    public login(): void {
        (this.$refs.login as LoginModal).modal.show();
    }
}
</script>

<style lang="less">
@import "./cssresources/theme.less";
</style>
