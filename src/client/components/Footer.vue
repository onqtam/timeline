<template>
    <!-- https://vuetifyjs.com/en/components/footer/ -->
    <v-footer app absolute padless>
        <v-card
            flat
            tile
            class="lighten-1 white--text text-center"
            style="width: 100%"
        >
            <v-card-text>
                <v-btn
                    v-for="icon in icons"
                    :key="icon"
                    class="mx-4 white--text"
                    icon
                >
                <v-icon size="24px">
                    {{ icon }}
                </v-icon>
                </v-btn>
            </v-card-text>

            <v-card-text class="white--text pt-0">
                All ToS of YouTube is obeyed.
            </v-card-text>

            <v-divider></v-divider>

            <v-card-text class="white--text">
                {{ new Date().getFullYear() }} — <strong>Unpinch</strong>
            </v-card-text>
        </v-card>
    </v-footer>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class Footer extends Vue {
    icons = [
        'mdi-facebook',
        'mdi-twitter',
        'mdi-linkedin'
    ];
}
</script>
