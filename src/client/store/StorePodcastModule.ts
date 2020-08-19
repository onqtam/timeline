import { Podcast, Episode, AgendaItem } from "@/logic/entities/Podcast";
import Timepoint from "@/logic/Timepoint";
import AsyncLoader from "@/client/utils/AsyncLoader";
import { RandomString } from "@/logic/RandomHelpers";
import CommonParams from '@/logic/CommonParams';
import { HTTPVerb } from '@/logic/HTTPVerb';
import { ActionContext } from 'vuex';
import { moduleActionContext } from '.';
import { localActionContext } from 'direct-vuex';

export interface IStorePodcastModule {
    allPodcasts: Podcast[];
    findEpisode(podcastTitleURL: string, episodeTitleURL: string): Episode|undefined;
}

export class StorePodcastViewModel implements IStorePodcastModule {
    public allPodcasts!: Podcast[];

    constructor() {
        this.allPodcasts = [];
    }

    public findEpisode(podcastTitleURL: string, episodeTitleURL: string): Episode|undefined {
        const podcast: Podcast|undefined = this.allPodcasts.find(p => p.titleAsURL === podcastTitleURL);
        return podcast?.episodes.find(e => e.titleAsURL === episodeTitleURL);
    }


    public updatePodcastData(newPodcastData: Podcast[]): void {
        this.allPodcasts.splice(0, this.allPodcasts.length, ...newPodcastData);
    }

    public async fetchPodcastData(): Promise<Podcast[]> {
        const restURL: string = `${CommonParams.APIServerRootURL}\\podcasts`;
        const fetchPromise = AsyncLoader.makeRestRequest(restURL, HTTPVerb.Get, null, Podcast) as Promise<Podcast[]>;
        return fetchPromise;
    }
}

const podcastModule = new StorePodcastViewModel();
// Getting Vuex to work with TypeScript is a whole thing...
// Define the module as a global var and export the Vuex module object with all of its public functions
// Refer to the docs of direct-vuex for more info
export default {
    namespaced: true as true,
    state: podcastModule,
    mutations: {
        // Update the podcast data in the store;
        // Don't call this directly; use the refreshPodcastData action instead
        internalUpdatePodcastData: (state: StorePodcastViewModel, newPodcasts: Podcast[]): void => {
            state.updatePodcastData(newPodcasts);
        }
    },
    actions: {
        refreshPodcastData: async (context: ActionContext<StorePodcastViewModel, StorePodcastViewModel>): Promise<void> => {
            return context.state.fetchPodcastData()
                .then(podcasts => {
                    localActionContext
                    // Call the type-unsafe commit; We could call the function directly but this triggers
                    // warnings about modifying state outside of commits
                    context.commit("internalUpdatePodcastData", podcasts);
                });
        },
        initPodcastData: async (context: ActionContext<StorePodcastViewModel, StorePodcastViewModel>): Promise<void> => {
            if (context.state.allPodcasts.length !== 0) {
                return;
            }
            return context.dispatch("refreshPodcastData");
        }
    }
};
