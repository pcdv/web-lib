# web-lib

Framework-free helpers for the web pages of a few projects, written in TypeScript and
**copied** into each of them: no package, no build step in the projects.

| module     | what                                                          |
|------------|---------------------------------------------------------------|
| `dom`      | `$`, `h`, `replace`: building the DOM                         |
| `dialog`   | `ask`, `tell`: `prompt()` and `alert()` in a `<dialog>`       |
| `settings` | `readSetting`, `writeSetting`: browser storage, if available |
| `router`   | `startRouter`: the hash of the URL to a view, disposed after |

## Copying into a project

The project's lib directory holds a `web-lib.json` telling what it takes:

```json
{"lang": "js", "modules": ["dom", "dialog", "settings"]}
```

`"ts"` copies the sources. `"js"` converts them, keeping their lines and
comments, with a `.d.ts` beside each for a project type-checking its JS.
A module comes with the modules it imports.

```sh
npm run sync -- ../my-project/web/js/lib            # copy
npm run sync -- ../my-project/web/js/lib --check    # changed there, or behind?
```

The copies are not edited in the projects: a fix is made here, then synced.
The sync records the commit copied and a hash of each file in `web-lib.json`;
it refuses to overwrite a file changed in the project (`--force` does).

## Developing

Node 24 or later runs the TypeScript as it is.

```sh
npm install
npm test         # the tests, on the sources and on the JS they convert to
npm run check    # type-checks everything
```

The sources use only TypeScript that can be erased (`erasableSyntaxOnly`):
no enums, namespaces or parameter properties. Their imports name `.ts` files.
