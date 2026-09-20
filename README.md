# Frontend take-home

A dashboard based on the client data provided below, with two main parts:

* A stacked bar chart showing the data over time.
* A table with monthly details and expandable rows that reveal the level beneath.

## Assumptions and things missing from the assignment

* The example payload from the assignment has errors. Some reported parent values do not equal the sum of their children. For example, this occurs for Company in May 2024. Also every level should have a breakdown by channels.

* The payload does not describe how employee avatars should be retrieved, so I assumed they are served from a folder on the server and matched by filename, using the employee ID.

* The take-home brief did not describe how the date period should be selected. It seems unlikely that a real-world application would only need a fixed date range from February 2024 to January 2025. A more typical use case would allow the user to select a date range, so I added a Period picker.

* Once a Period picker is added, users may select anything from a few days to several years. The dashboard should remain usable in these cases and allow the data to be displayed by day, month, or year. For this reason, I added a selector for grouping the data by day, month, or year.

* Report projection preserves the supplied values for the default period (February 2024 through January 2025, grouped by month) and projects values for other periods and groupings. Lazy API responses keep the same node IDs, names, and values while adding only hierarchy load-state metadata.

* **Row-virtualization + lazy-pagination demo:** any selected period that extends outside the supplied February 2024–January 2025 data window uses generated report data and adds a deterministic `Scale demo — 2,000 employees` branch. Expand that branch to fetch the first 50 employees. As the virtual window approaches the loaded tail, the client requests the next page with `offset`/`limit` and appends it to the cached hierarchy. The DOM still contains only the viewport plus overscan. For a quick demo, select **Feb 1, 2025 – Mar 31, 2025** and watch `/api/report/children?...&offset=0&limit=50`, then `offset=50`, `offset=100`, and so on while scrolling.

* The hierarchy is loaded incrementally for scalability. `/api/report` returns the first page of the root's immediate children. `/api/report/children` accepts `parentId`, `offset`, and `limit` (page size 50 in the UI) and returns only that direct-child slice plus `childCount`/`childrenLoaded` metadata. Pages are appended into the React Query cache, so expanding a large branch no longer hydrates its entire child list.

* The hierarchy table vertically windows large visible row sets. Rows are fixed-height, so the table renders only the viewport plus an overscan buffer and uses spacer rows to preserve the native table layout, sticky headers, keyboard navigation, and treegrid row metadata. Small trees stay unwindowed to keep their DOM and accessibility behavior straightforward.

I would extend the data model with fields such as the selected date range and a range type (`day | month | year`) so that the payload could represent the full state of the application.

It would also be useful to add an `avatar` field to each employee so that the avatar filename is encoded directly in the payload. This would make the application state fully described by the payload without requiring additional assumptions or workarounds.

## Next things TODO

* Add authentication and authorization for displaying the data and retrieving it from the API.
* Add a tooltip that displays the number of clients in each category when the user hovers over a bar in the chart.
* Localization if required.

## Example

Try it at:

https://web-engineer-home-task.denslon.com/

## Run

Requires Node.js 20.19+.

```sh
npm install
npm run dev
```

Open the Vite address shown in the terminal, usually `http://localhost:5173`.

The API runs at `http://localhost:3002/api/report?from=2024-02-01&to=2025-01-31&detail=month` and is proxied by Vite.

Run:

```sh
npm test
```

for the interaction and chart tests, or:

```sh
npm run build
```

to verify the production bundle.

For a production run, build the application first, then use:

```sh
NODE_ENV=production npm start
```

To run the production application with Docker:

```sh
docker build -t cool-startup-dashboard .
docker run --rm -p 3002:3002 cool-startup-dashboard
```

Then open:

`http://localhost:3002`
