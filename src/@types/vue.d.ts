
import Vue from "vue";

declare module "vue/types/vue" {
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  interface Vue {
    // from VueRecomputed.ts
    $markRecomputable(propertyName: string): void;
    $recompute(propertyName: string): void;
  }
}
