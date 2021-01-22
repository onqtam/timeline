<template>
    <v-app-bar app>
        <v-tabs centered class="ml-n9">
            <v-tab to="/">Home</v-tab>
            <v-tab to="/about">About</v-tab>
            <v-tab v-if="!isUserGuest" to="/profile">Profile</v-tab>
            <v-dialog v-else v-model="showLoginDialog" width="500">
                <template v-slot:activator="{ on }">
                    <v-tab v-on="on">Login</v-tab>
                </template>
                <v-card>
                    <v-card-title class="headline justify-center">
                        Login with an external service
                    </v-card-title>
                    <v-card-actions class="justify-center">
                        <!-- icons are from here: https://materialdesignicons.com/ -->
                        <v-btn @click="login('google')">
                            <v-icon>mdi-google</v-icon>
                        </v-btn>
                        <v-btn @click="login('facebook')">
                            <v-icon>mdi-facebook</v-icon>
                        </v-btn>
                        <v-btn @click="login('twitter')">
                            <v-icon>mdi-twitter</v-icon>
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-tabs>
    </v-app-bar>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import store from "@/client/store";

@Component
export default class Navbar extends Vue {
    get showLoginDialog() {
        return store.state.user.showLoginDialog;
    }
    set showLoginDialog(newVal: boolean) {
        store.commit.user.setShowLoginDialog(newVal);
    }

    public get isUserGuest() {
        return store.state.user.info.isGuest;
    }

    public login(service: string): void {
        if (service !== "google") {
            alert(service + " not supported for login yet!");
        } else {
            store.dispatch.user.login();
        }
    }
}
</script>

<style lang="less">
</style>
