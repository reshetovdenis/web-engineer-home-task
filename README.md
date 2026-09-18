# Cool Startup book of business

A React and TypeScript dashboard for the client tree in `task.pdf`. A small Express API serves the supplied JSON. Tailwind CSS provides the layout and component styles, with shared colors and type defined in `src/styles.css`. The layout, colors, spacing and table hierarchy follow frame `5:2477` in `figma-export/raw/root.json`. Selecting a row updates the chart to that node.

TanStack Query loads the company tree and caches successful responses for five minutes. After that, it can refresh stale data when the dashboard mounts, the window regains focus, or the connection resumes. Failed requests show a manual retry button.

The header uses React DayPicker to select dates from 2020 through 2030. Choosing a period selects day detail for up to 31 days, month detail for up to 12 calendar months, and year detail for longer periods; the detail selector can still be changed manually. Monthly selections wholly within February 2024–January 2025 use the supplied `/api/company` values. Other selections use `/api/report`, which generates repeatable demo values from the same company, branches, employees, and channels. If an older API process responds with 404, the browser generates the same report from the supplied company data. Supplied monthly values stay exact where available. Year detail totals the selected months in each year; day detail interpolates between monthly values. Long reports are paged in the chart and table.

## Run

Requires Node.js 20.19+.

```sh
npm install
npm run dev
```

Open the Vite address shown in the terminal (usually `http://localhost:5173`). The API runs at `http://localhost:3002/api/company` and is proxied by Vite. Run `npm test` for the interaction and chart tests, or `npm run build` to check the production bundle. For a production run, build first, then use `NODE_ENV=production npm start`.

To run the production app with Docker:

```sh
docker build -t cool-startup-dashboard .
docker run --rm -p 3002:3002 cool-startup-dashboard
```

Open `http://localhost:3002`.

## Decisions and open questions

- The 12 figures are treated as client counts for February 2024 through January 2025, in the order given.
- The design legend specifies `Existing clients`, `New organic` and `New paid`. Only Anna Blackwood has explicit channels. The chart uses her supplied organic and paid figures, and treats the remainder of each selected node's reported total as existing clients. This is a presentation assumption, not a claim that all unattributed clients are actually existing clients.
- The Figma mockup draws colored organic and paid segments in February 2024, while the supplied channel values for that month are zero. The implemented segment heights follow the supplied data, so those bars cannot be pixel-identical to the illustration.
- Some component PNGs also show figures that differ from the supplied JSON (for example, Branch 1's July value). The table follows the JSON.
- Some reported parent values do not equal the sum of their children (for example Company and Anna Blackwood in May 2024). The table preserves every supplied figure; the chart uses the selected row's reported total. The source of the differences needs clarification.
- Rows with no child array are leaves. They remain selectable without an expansion control or chevron.
- The Figma export includes node geometry, styles, text, and rendered PNGs. The desktop page and table states were compared with those references at their native sizes.

## Next

If this were a product, I would confirm how parent and child figures should reconcile, add API schema validation, support larger trees with virtualization, and add integration tests for API failures and narrow screens.
