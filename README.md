# Global Prayer Times Map

A real-time visualization of Islamic prayer times across the globe. The map divides the world into 6 colored zones (Fajr, Duha, Dhuhr, Asr, Maghrib, Isha) based on the current time and location.

## Features

*   **Interactive Map:** View prayer zones on a global scale.
*   **Projections:** Switch between Mercator, Globe (Orthographic), and Equirectangular projections.
*   **Time Travel:** Use the slider to see how zones shift throughout the day (UTC).
*   **Customization:** Choose different prayer calculation methods (MWL, ISNA, etc.) and Asr juristic methods (Standard vs. Hanafi).
*   **Offline Capable:** All dependencies are included in the `lib/` folder.

## How to Run

This project is a static web application. However, due to browser security restrictions (CORS) regarding loading local JSON data (`data/world-110m.json`), you cannot simply double-click `index.html` to run it. You must serve it via a local web server.

### Option 1: Using Python (Recommended)

If you have Python installed (most Mac/Linux systems do):

1.  Open a terminal/command prompt in the project folder.
2.  Run one of the following commands:
    *   For Python 3: `python3 -m http.server`
    *   For Python 2: `python -m SimpleHTTPServer`
3.  Open your browser and go to `http://localhost:8000`.

### Option 2: Using Node.js

If you have Node.js installed:

1.  Install a simple server globally (once): `npm install -g http-server`
2.  Run the server: `http-server`
3.  Open your browser and go to the URL shown (usually `http://localhost:8080`).

### Option 3: VS Code Live Server

If you use Visual Studio Code:

1.  Install the "Live Server" extension.
2.  Right-click `index.html` and select "Open with Live Server".

## Project Structure

*   `index.html`: Main entry point.
*   `css/style.css`: Styling.
*   `js/app.js`: Map rendering and visualization logic.
*   `js/prayer-logic.js`: Prayer time calculation logic (using Adhan.js).
*   `data/`: Contains the world map TopoJSON.
*   `lib/`: Third-party libraries (D3, TopoJSON, Adhan).

## Dependencies

*   [D3.js](https://d3js.org/) (v7)
*   [TopoJSON](https://github.com/topojson/topojson)
*   [Adhan.js](https://github.com/batoulapps/adhan-js)
