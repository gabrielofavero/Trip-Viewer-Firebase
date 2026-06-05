# Offline Mode — Implementation Plan

> **Goal:** Convert a trip (view.html + itinerary.html + destination.html + expenses.html) into a fully offline, self-contained package that runs on an iPhone without internet.
>
> **Strategy:** A Python build script that exports Firestore data → downloads all images → generates a self-contained HTML/CSS/JS site with all Firebase dependencies stripped out and replaced by local JSON data.
>
> **Output:** A `.zip` file that can be extracted and opened directly on an iPhone (via Files app → open in browser), or served via any static HTTP server.
