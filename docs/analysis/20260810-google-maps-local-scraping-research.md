# Local Google Maps Scraping with Place Photos

Research date: 10 August 2026

## Objective

Find a free or inexpensive solution that:

1. Receives a Google Maps URL as input.
2. Extracts structured place information, including photos.
3. Can run locally.
4. Can preferably be deployed on Cloudflare.
5. Does not depend on a browser extension or add-on.

## Recommendation

The strongest match is [`gosom/google-maps-scraper`](https://github.com/gosom/google-maps-scraper).

It is written in Go rather than JavaScript, but it fits the functional requirements better than the JavaScript alternatives. It is MIT licensed, actively maintained, and supports local execution through Docker or a compiled binary. It also provides a local Web UI and REST API.

### Why it is the best match

- Accepts normal Google Maps place and search URLs.
- Accepts shortened `maps.app.goo.gl` URLs.
- Produces CSV or JSON.
- Runs locally using Docker and Playwright.
- Includes a Web UI and asynchronous REST API.
- Extracts business name, category, address, telephone, website, coordinates, opening hours, ratings, reviews, price range, Google identifiers and other fields.
- Provides `thumbnail`, `street_view_url`, and an `images` array containing associated image URLs.
- Can export to JSON, CSV, PostgreSQL, S3, or a custom writer.

## Candidate comparison

| Project | Direct Maps URL | Photo support | Local execution | Cloudflare suitability | Conclusion |
| --- | --- | --- | --- | --- | --- |
| [`gosom/google-maps-scraper`](https://github.com/gosom/google-maps-scraper) | Yes, including shortened URLs | Multiple URLs in `images[]`, thumbnail and Street View URL | Docker, binary, Web UI and REST API | Docker container on paid Containers, or extraction logic ported to Browser Run | Best overall match |
| [`noworneverev/google-maps-scraper`](https://github.com/noworneverev/google-maps-scraper) | Yes | One main `image_url` and `photos_count` | Python and Playwright | Requires a rewrite | Useful lightweight alternative, but not a full photo gallery solution |
| [`FenrirDWolf/Google-Map-Scraper`](https://github.com/FenrirDWolf/Google-Map-Scraper) | Primarily keyword and location input | Photo extraction is not documented | Electron, Node.js and Docker | Poor fit | Does not meet the exact URL and photo requirements |
| [`omkarcloud/google-maps-scraper`](https://github.com/omkarcloud/google-maps-scraper) | Primarily query-based | Photo behavior is not sufficiently clear for this use case | Its current workflow is tied more closely to its desktop/hosted offering | Poor fit | Not as independent or predictable as the recommended project |
| GeoLeadScraper | Browser extension/add-on | Available through the add-on | Browser-dependent | Not suitable | Excluded because it is not a standalone local service |

## Local setup

Create a `queries.txt` file containing one Maps URL per line, for example:

```text
https://maps.app.goo.gl/example
https://www.google.com/maps/place/Empire+State+Building/@40.7484405,-73.9856632
```

Run the scraper:

```bash
mkdir -p gmaps-output

docker run \
  -v gmaps-playwright-cache:/opt \
  -v "$PWD/queries.txt:/queries.txt:ro" \
  -v "$PWD/gmaps-output:/out" \
  gosom/google-maps-scraper \
  -input /queries.txt \
  -json \
  -results /out/results.json \
  -depth 1 \
  -exit-on-inactivity 3m
```

To start its local Web UI and REST API:

```bash
mkdir -p gmapsdata

docker run \
  -v "$PWD/gmapsdata:/gmapsdata" \
  -p 8080:8080 \
  gosom/google-maps-scraper \
  -data-folder /gmapsdata
```

The interface is then available at `http://localhost:8080`. The documented REST endpoints can create, inspect, delete and download scraping jobs.

## Photo handling

The recommended scraper returns Google-hosted photo URLs. Its documentation does not promise that these URLs are permanent, that every gallery photo will be returned, or that every URL points to the original-resolution file.

For durable local output, a small post-processing service should download the images immediately after scraping. A suitable output structure is:

```text
data/
  {placeId}/
    place.json
    01.jpg
    02.jpg
    03.jpg
```

The downloader should:

1. Read `thumbnail` and `images[]` from the scraper result.
2. Follow redirects and download a configurable number of images.
3. Validate content type and maximum file size.
4. Deduplicate images using a content hash.
5. Save both the original source URL and the local relative path.
6. Record failures without failing the entire place import.
7. Avoid assuming that a Google-hosted URL is permanent.

## Suggested local API

A small Node.js/TypeScript wrapper can provide the desired one-request workflow:

```http
POST /scrape
Content-Type: application/json

{
  "url": "https://maps.app.goo.gl/example",
  "maxImages": 5
}
```

The wrapper would:

1. Validate the supplied Maps URL.
2. Submit it to the locally running scraper.
3. Wait for or poll the scraping job.
4. Normalize the result into the application schema.
5. Download the selected photos.
6. Return the structured place data and local image paths.

This keeps the proven scraper unchanged while exposing a JavaScript-friendly interface for TripViewer or another application.

## Cloudflare deployment options

### Option 1: Cloudflare Browser Run

The scraper logic can be rewritten in TypeScript using [`@cloudflare/playwright`](https://developers.cloudflare.com/browser-run/playwright/) and deployed as a Worker using Cloudflare Browser Run.

Advantages:

- JavaScript/TypeScript implementation.
- Runs on Cloudflare without maintaining a server.
- Can write downloaded photos directly to R2.
- Supports local development through `npx wrangler dev`.

Limitations:

- The existing Go repository cannot be deployed unchanged as a normal Worker.
- The free plan includes only 10 browser-minutes per day.
- The free plan permits three concurrent browser sessions and has a 60-second browser timeout.
- Cloudflare states that Browser Run requests are identifiable as bot traffic, so Google can block or challenge them.
- Google Maps selectors and behavior can change, requiring maintenance.

This option is appropriate only for low-volume imports or after validating that a typical place scrape completes reliably inside the free limits.

### Option 2: Cloudflare Containers

The Docker-based scraper is a better architectural fit for Cloudflare Containers than for standard Workers. However, Containers are not available on the free plan. They require the Workers Paid plan, whose minimum charge is currently USD 5 per month.

This path minimizes rewriting but still needs deployment testing, particularly for Chromium dependencies, memory requirements and anti-bot behavior.

### Option 3: Hybrid local and Cloudflare architecture

The most practical initial architecture is:

```text
TripViewer or local client
        |
        v
Node/TypeScript wrapper
        |
        v
gosom scraper in local Docker
        |
        +--> Local JSON and image files
        |
        +--> Optional Cloudflare R2 storage
```

Cloudflare can later provide authentication, public routing and R2 storage while browser automation continues locally or in a small container host.

## Alternative photo source

For photos that can be retained with clearer licensing, Wikimedia Commons is a useful secondary source.

A hybrid importer can:

1. Extract the place name and coordinates.
2. Query the Wikimedia Commons MediaWiki API for images near those coordinates or associated with the corresponding Wikidata entity.
3. Download the image and its attribution/license metadata.
4. Prefer appropriately licensed files over Google-hosted user photos.

This works particularly well for landmarks, museums, monuments, public buildings and major attractions. Coverage is much weaker for ordinary restaurants, shops and hotels.

## Legal and operational considerations

Google's current Maps Platform terms explicitly prohibit scraping, storing, resharing and rehosting Google Maps content outside the services. This includes place information and imagery. Individual contributed photos can also be protected by their creators' copyrights.

Therefore:

- Technical availability does not imply permission to retain or republish the content.
- Publicly displaying downloaded Google photos is riskier than using them privately as temporary planning references.
- Wikimedia Commons or photos supplied by the business itself are safer choices when images need to be stored and redistributed.
- Rate limiting, delays and low concurrency are necessary to reduce blocking, although they do not resolve the terms issue.

## Final decision

Use `gosom/google-maps-scraper` locally as the extraction engine and add a small TypeScript wrapper that accepts a Maps URL, normalizes the result and downloads a limited number of photos.

For Cloudflare:

- Use Browser Run only for low-volume free usage after a proof of concept.
- Use Cloudflare Containers if the USD 5/month plan is acceptable and minimal rewriting is preferred.
- Use R2 for photos only when their licensing permits storage and redistribution.

## Sources

- [gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper)
- [noworneverev/google-maps-scraper](https://github.com/noworneverev/google-maps-scraper)
- [FenrirDWolf/Google-Map-Scraper](https://github.com/FenrirDWolf/Google-Map-Scraper)
- [omkarcloud/google-maps-scraper](https://github.com/omkarcloud/google-maps-scraper)
- [Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/)
- [Cloudflare Browser Run Playwright documentation](https://developers.cloudflare.com/browser-run/playwright/)
- [Cloudflare Browser Run pricing](https://developers.cloudflare.com/browser-run/pricing/)
- [Cloudflare Browser Run limits](https://developers.cloudflare.com/browser-run/limits/)
- [Cloudflare Containers pricing](https://developers.cloudflare.com/containers/pricing/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Wikimedia Commons MediaWiki API](https://commons.wikimedia.org/wiki/Commons:API/MediaWiki)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms)
