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
| `npm run serve` | Run the dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run linter |
| `npm run lint-autofix` | Run linter and autofix errors |

### Recommended process

1. Open the project dir in VSCode
1. Run `npm run serve` in a terminal
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

[vue-devtools]: https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd?hl=en
[vue-cli]: https://cli.vuejs.org/guide/