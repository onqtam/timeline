import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Home from "../views/Home.vue";
import ListenView from "../views/Listen.vue";
import EpisodesView from "../views/Episodes.vue";
import PodcastsView from "../views/Podcasts.vue";
import Timepoint from "@/logic/entities/Timepoint";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
    {
        path: "/home",
        name: "Home",
        component: Home
    },
    {
        path: "/about",
        name: "About",
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ "../views/About.vue")
    },
    {
        path: "/listen/:podcastTitle/:episodeTitle",
        name: "Listen",
        component: ListenView,
        props: (route) => ({
            initialTimepoint: Timepoint.tryParseFromURL(route.query.t as string),
            threadIdToFocus: ~~(route.query.thread as string),
            podcastTitleURL: route.params.podcastTitle,
            episodeTitleURL: route.params.episodeTitle
        })
    },
    {
        path: "/episodes/:podcastTitle",
        name: "Episodes",
        component: EpisodesView,
        props: true
    },
    {
        path: "/podcasts",
        name: "Podcasts",
        component: PodcastsView,
        props: true
    },
    {
        path: "/",
        // TODO: Obviously hard-coding a podcast isn't perfect but it's a necessity during development
        redirect: "/episodes/The%20Portal"
    }
];

const router = new VueRouter({
    routes
});

export default router;
