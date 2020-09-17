<template>
    <div>
        <VModal ref="login-modal">
            <template v-slot:header>
                Log In
            </template>
            <template v-slot:body>
                Via...
                <hr>
                <VButton @click=login>
                    <i class="fa fa-google" aria-hidden="true"></i>
                </VButton>
            </template>
        </VModal>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import store from "@/client/store";

import VButton from "@/client/components/primitives/VButton.vue";
import VModal from "@/client/components/primitives/VModal.vue";

@Component({
    components: {
        VButton,
        VModal
    },
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
