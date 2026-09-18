# Frontend take-home

A dashboard based on the client data provided below, with two main parts:

* A stacked bar chart showing the data over time.
* A table with monthly details and expandable rows that reveal the level beneath.

## Assumptions and things missing from the assignment

* Some reported parent values do not equal the sum of their children. For example, this happens for Company in May 2024. The table preserves every supplied figure, while the chart uses the reported total for the selected row.

* The payload does not describe how employee avatars should be retrieved, so I assumed they are served from a folder on the server and matched by filename, using the employee ID.

* The take-home brief did not describe how the date period should be selected. It seems unlikely that a real-world application would only need a fixed date range from February 2024 to January 2025. A more typical use case would allow the user to select a date range, so I added a Period picker.

* Once a Period picker is added, users may select anything from a few days to several years. The dashboard should remain usable in these cases and allow the data to be displayed by day, month, or year. For this reason, I added a selector for grouping the data by day, month, or year.

* Implementing these features required modifying how the API serves the payload. The report endpoint serves the same payload as the one provided in the take-home assignment for the default period (February 2024 through January 2025, grouped by month). It serves projected values in the same data model for other periods and groupings.

  I did not modify the payload data model itself, since it was not clear whether doing so was allowed.

I would extend the data model with fields such as the selected date range and a range type (`day | month | year`) so that the payload could represent the full state of the application.

It would also be useful to add an `avatar` field to each employee so that the avatar filename is encoded directly in the payload. This would make the application state fully described by the payload without requiring additional assumptions or workarounds.

## Next things TODO

* Add authentication and authorization for displaying the data and retrieving it from the API.

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
