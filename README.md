# Cambridge Pseudocode Runner

Cambridge Pseudocode Runner is a pure frontend teaching tool for running Cambridge-style pseudocode directly in the browser.

It is designed for students and teachers who want to paste, run, inspect, and debug pseudocode without installing a desktop IDE or using a backend service.

This is an independent teaching tool and is not an official Cambridge International product.

## Main Features

- Browser-based pseudocode execution with no backend.
- Code editor, standard input, output, errors, variables, virtual files, and execution trace panels.
- Example Gallery for loading common pseudocode examples.
- Upload `.txt`, `.pseudo`, or `.pseudocode` files into the editor.
- Download current code and run reports as text files.
- Copy code, output, errors, and trace text to the clipboard.
- Friendly syntax tolerance for comments, lowercase keywords, `END IF`-style spacing, and assignment using `=`.
- Student-friendly error messages for common mistakes.

## Supported Pseudocode

Core features include:

- `DECLARE`
- `INPUT` / `OUTPUT`
- `IF` / `ELSE` / `ENDIF`
- `CASE` / `OTHERWISE` / `ENDCASE`
- `FOR` / `NEXT`
- `WHILE` / `ENDWHILE`
- `REPEAT` / `UNTIL`
- `ARRAY`
- `STRING`, `INTEGER`, `REAL`, `BOOLEAN`, `CHAR`

Advanced features include:

- `PROCEDURE` / `CALL`
- `BYVALUE` / `BYREF`
- `FUNCTION` / `RETURN`
- `TYPE` / record-style data
- virtual file handling
- built-in functions
- comments
- execution trace

Virtual files are simulated in browser memory only. They exist only during one run and do not read from or write to the user's real local filesystem.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The built files will be written to `dist`.

## GitHub Pages Deployment

This project is configured for a GitHub repository named `cambridge-pseudocode-runner`, with this Vite base path:

```ts
base: '/cambridge-pseudocode-runner/'
```

To deploy manually after making changes:

```bash
npm run build
git add .
git commit -m "Update Cambridge pseudocode runner"
git push
```

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs on pushes to `main`, installs dependencies, builds the app, and deploys the `dist` folder to GitHub Pages.

In the GitHub repository settings, set Pages to use GitHub Actions as the deployment source.

## Notes

- This is a pure frontend React/Vite app.
- There is no server, database, or real local filesystem access.
- Virtual files exist only during one run.
- This is not an official Cambridge International product.
