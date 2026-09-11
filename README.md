<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/327de911-14e7-40fe-9b3a-9201b6762b2e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## V3 KIE compatibility patch
- Generation remains browser -> same-origin `/api/kie/responses` -> KIE.
- The server-side KIE request now matches the official KIE cURL header set exactly: `Authorization` and `Content-Type`.
- No custom `Accept`, `Cache-Control`, or `User-Agent` headers are sent upstream.
- No automatic duplicate generation/retry was added, preserving the one-request-per-generation rule.
- The UI/visual design is unchanged.
