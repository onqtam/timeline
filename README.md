## Initial Dev Setup

1. Install VSCode and these extensions:
    * Vetur (syntax highlighting for .vue files)
    * Debugger for Chrome (enables VSCode to connect with Chrome over the debug protocol, only if you want to use VSCode for debugging)
1. Install the [Vue DevTools for Chrome][vue-devtools] (and Chrome if you don't have it)
1. Install latest NodeJS LTS version
1. Install the [Vue-CLI][vue-cli] tools (only really necessary if you want to modify the project's setup):

    ```cmd
    npm install -g @vue/cli
    ```

1. Install all tools used throughout the project. Might take a while, get a beer while waiting.

    ```cmd
    cd project-dir
    npm install
    ```

## Development Process

### Frequently used commands

| Command | Effect |
| :------ | :----- |
| `npm run dev-client` | Run the dev version of the frontend |
| `npm run dev-server` | Run the dev version of the server |
| `npm run build-client` | Build frontend for production |
| `npm run build-server` | Build server for production |
| `npm run lint` | Run linter |
| `npm run lint-autofix` | Run linter and autofix errors |

### Recommended process

1. Open the project dir in VSCode
1. Run `npm run dev-client` in a terminal
1. Run `npm run dev-server` in a second terminal
1. Go to [localhost:8080](localhost:8080)
1. Change code, see the change applied in the browser immediately
    * You can debug in Chrome or you can debug in VS Code by clicking *Run* (on the left top-level menu in VSCode) and then hit the *Debug* button.
    This will launch a separate Chrome window.
1. When committing, the system will run a lint check and ask you to fix any issues

## Coding convention

### Naming

| Feature         | Casing      |
| --------------- | ----------- |
| Classes         | PascalCase  |
| Local Variables | camelCase   |
| Function args   | camelCase   |
| Public Members  | camelCase   |
| Private Members | camelCase   |
| Functions       | camelCase   |
| Constants       | SCREAM_CASE |

1. Do NOT use `_` for private fields. Vue has a variety of issues with members prefixed with `$` or `_` which make development much harder.
2. Order class members in this order:

    * public data members
    * protected data members
    * private data members
    * public function members
    * protected function members
    * private function members

3. When a data class and a component class need to use similar names, add the `Component` suffix to the component. Example:
`Comment` is the data class, `CommentComponent` is the Component which renders a single comment.
4. Add the suffix `View` to any complete view. Always place them in the *Views* directory.
5. When working with store (Vuex) data:
    * Do NOT access directly store state. Create computed properties in your component which refer to it
    * Do call directly store mutations/actions.

## Overall project architecture

We use Vue on the client to build a SPA and Node/Express/PostgreSQL on the server. TypeScript is used throughout as the only programming language.

### File structure

As much as possible is shared between the client and the backend. Keep it that way. Major differences are outlined below.

| Directory                  | Expect to find    |
| -------------------------- | ----------- |
| *src/client*               | client (frontend) code  |
| *src/logic*                | shared client & server code   |
| *src/server*               | server code   |
| *tsconfig.base.json*       | the tsconfig with common settings between client & server   |
| *tsconfig.json*            | the tsconfig for the **client**. It's in the root dir because of Vue-CLI limitations   |
| *src/server/tsconfig.json* | the tsconfig for the **server**   |


### Client-side

Alongside Vue, these Vue extensions are installed:

* Vuex - Vue's state management library. Vue's Flux. It's purpose is to be a heterogenous, global storage of variables used throughout the entire client side.
* Direct Vuex - A small open-source library which acts as a TypeScript-wrapper around Vuex
* Vue Router - Used for routing (history, back, forward, etc.)
* Vue-CLI - This is the collection of Vue's tools. They are used everywhere on the client side to build, run dev server, install new vue plugins, etc.

#### Build/configuration system

The entire build / dev system is based on Vue-CLI. The *tsconfig.json* at the repo's root is the one used for the **client**. This is because Vue-CLI may not use any other config file :/.

### Server-side

* Express.js - Our HTTP server. It's only implemented at the most basic level. Currently, we have not implemented **pretty much all performance and security options of Express**.

#### Build/configuration system

The dev version of the build system is based on `nodemon` and `ts-node`. `ts-node` allows one to execute TypeScript without intermediate compilation (this allows us to greatly simplify the dev environment) and `nodemon` is a demon responsible for restarting the server whenever server code is changed.

[vue-devtools]: https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd?hl=en
[vue-cli]: https://cli.vuejs.org/guide/
