<template>
    <v-app>
        <Navbar/>
        <v-main app>
            <v-container style="padding: 0; height: 100%;">
                <!-- key is used so pages are re-rendered when path params change -->
                <router-view :key=$route.path class="grey darken-4" style="height: 100%;"/>
            </v-container>
        </v-main>
        <Footer/>
    </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import store from "./store";
import User from "@/logic/entities/User";
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";

@Component({
    components: {
        Navbar,
        Footer
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
