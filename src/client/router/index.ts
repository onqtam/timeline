import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import Home from "../views/Home.vue";
import ListenView from "../views/Listen.vue";
import EpisodesView from "../views/Episodes.vue";
import ChannelsView from "../views/Channels.vue";
import ProfileView from "../views/Profile.vue";
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
        path: "/listen/:channelTitle/:episodeTitle",
        name: "Listen",
        component: ListenView,
        props: (route) => ({
            initialTimepoint: Timepoint.tryParseFromURL(route.query.t as string),
            threadIdToFocus: ~~(route.query.thread as string),
            channelTitleURL: route.params.channelTitle,
            episodeTitleURL: route.params.episodeTitle
        })
    },
    {
        path: "/episodes/:channelTitle",
        name: "Episodes",
        component: EpisodesView,
        props: true
    },
    {
        path: "/channels",
        name: "Channels",
        component: ChannelsView,
        props: true
    },
    {
        path: "/profile",
        name: "Profile",
        component: ProfileView,
        props: true
    },
    {
        path: "/",
        // TODO: Obviously hard-coding a channel isn't perfect but it's a necessity during development
        redirect: "/episodes/The%20Portal"
        // redirect: "/episodes/Making%20Sense%20with%20Sam%20Harris"
    }
];

const router = new VueRouter({
    routes
});

export default router;
