## Initial Dev Setup

1. Install VSCode with extensions with the [Vetur Extension][vscode-vetur]
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
1. Change code, see it change
1. When committing, the system will run a lint check and ask you to fix any issues

## Coding convention

### Naming

| Feature         | Casing      |
| --------------- | ----------- |
| Classes         | PascalCase  |
| Local Variables | camelCase   |
| Function args   | camelCase   |
| Members         | camelCase   |
| Functions       | camelCase   |
| Constants       | SCREAM_CASE |

[vscode-vetur]: https://marketplace.visualstudio.com/items?itemName=octref.vetur
[vue-devtools]: https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd?hl=en
[vue-cli]: https://cli.vuejs.org/guide/