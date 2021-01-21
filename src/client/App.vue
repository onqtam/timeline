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

                <v-dialog v-model="dialog" width="500">
                    <template v-slot:activator="{ on }">
                        <v-tab v-on="on">Login</v-tab>
                    </template>
                    <v-card>
                        <v-card-title class="headline justify-center">
                            Login with an external service
                        </v-card-title>
                        <v-card-actions class="justify-center">
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

        <v-main app>
            <!-- <v-container fluid>
                <v-row>
                    <v-col> -->
                        <router-view class="brown darken-4" style="width:1500px;"/>
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

@Component({})
export default class App extends Vue {
    private dialog = false;
    public beforeMount(): void {
        User.initSpecialUsers();
        store.dispatch.user.loadUser();
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
@import "./cssresources/theme.less";
</style>
