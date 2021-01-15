<template>
    <v-app id="app">
        <v-navigation-drawer app id="nav">
            <v-btn to="/">Home</v-btn>
            <v-btn to="/about">About</v-btn>
            <v-btn to="/profile">Profile</v-btn>
            <v-btn @click=login>Login</v-btn>
        </v-navigation-drawer>

        <v-main>
            <v-container fluid>
                <LoginModal ref="login"></LoginModal>
                <router-view/>
            </v-container>
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

* {
    color: @theme-text-color;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: rgb(66, 66, 66);
    display: grid;
    justify-content: center;
    // place-content: center; // same effect as justify-content

    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
}

// https://web.dev/min-max-clamp/
#app {
    // https://stackoverflow.com/questions/17904088/disable-less-css-overwriting-calc
    width: ~"max(80vw, calc(800px - 3vw))";
    max-width: 1500px;
}

// https://blog.francium.tech/responsive-web-design-device-resolution-and-viewport-width-e7b7f138d7b9
@media screen and (max-width: 800px) {
    #app {
        width: 97vw; // otherwise (with 100vw) a horizontal scroll bar might appear
    }
}

#nav {
    a {
        &.router-link-exact-active {
            color: #42b983;
        }
    }
}
</style>
