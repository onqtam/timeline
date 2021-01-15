<template>
    <div>
        <VModal ref="login-modal">
            <template v-slot:header>
                Log In
            </template>
            <template v-slot:body>
                Via...
                <hr>
                <v-btn @click=login>
                    <v-icon>mdi-google</v-icon>
                </v-btn>
            </template>
        </VModal>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import store from "@/client/store";

import VModal from "@/client/components/primitives/VModal.vue";

@Component({
    components: {
        VModal
    }
})
export default class LoginModal extends Vue {
    public get modal(): VModal {
        return this.$refs["login-modal"] as VModal;
    }
    public login(): void {
        store.dispatch.user.login();
    }
}
</script>

<style scoped lang="less">
@import "../cssresources/theme.less";

.fa {
    color: @theme-background;
}
</style>
