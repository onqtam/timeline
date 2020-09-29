<template>
    <div id="app">
        <div id="nav">
            <router-link to="/">Home</router-link> |
            <router-link to="/about">About</router-link>
            <VButton @click=login>Login</VButton>
        </div>
        <LoginModal ref="login"></LoginModal>
        <router-view/>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import VButton from "@/client/components/primitives/VButton.vue";
import LoginModal from "@/client/views/Login.vue";
import store from "./store";
import User from "@/logic/entities/User";

@Component({
    components: {
        VButton,
        LoginModal
    }
})
export default class App extends Vue {
    public beforeMount(): void {
        User.initGuestUser();
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
}

html, body, #app {
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
    background: @theme-background;

    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    overflow: hidden;
}

#nav {
    padding: 30px;

    a {
        font-weight: bold;
        color: #2c3e50;

        &.router-link-exact-active {
            color: #42b983;
        }
    }
}
</style>
