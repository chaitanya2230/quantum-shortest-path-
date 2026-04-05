# Quantum Emergency Ambulance Routing System

## Overview
The Quantum Emergency Ambulance Routing System is an advanced, real-time tracking and dispatch application designed to optimize emergency response times. It integrates geolocation services, traffic-aware routing mechanisms, and dynamic hospital discovery to ensure patients receive timely medical attention.

## Features
- **Real-Time GPS Tracking**: Precise patient and ambulance location monitoring.
- **Dynamic Hospital Discovery**: Automatic identification of nearby hospitals using comprehensive geospatial data.
- **Intelligent Routing**: Employs live traffic data to compare Normal, Optimal, and "Quantum" routes (optimized paths).
- **Automated Dispatch Integration**: Supports auto-dispatch and SOS features mapped via interactive interfaces.
- **Visual Analytics**: Interactive map displays utilizing Leaflet with customizable tile layers (Dark, Satellite, Street).

## Technologies Used
- HTML5 / CSS3 / Vanilla JavaScript
- Leaflet Maps API (Map presentation)
- OSRM (Open Source Routing Machine) API
- OpenStreetMap Data
- Python Backend (for deployment, API routing, and system integrations)

## Demonstration
The interface provides a rich, dark-mode prioritized UI equipped with:
- Intelligent tracking overlays.
- A phase flow simulator detailing the state: `Ambulance` -> `You` -> `Hospital`.
- Insightful statistics comparing normal routing vs. optimized routing performance.

## Setup Instructions
To run this application locally:

1. Clone the repository.
`git clone https://github.com/chaitanya2230/quantum-shortest-path-.git`

2. Open `index.html` in your web browser or serve the folder through a local static server.

## Future Scope
- Implementation of predictive machine learning models for proactive ambulance staging.
- Refinement of "Quantum" algorithms for predictive high-density traffic mapping.
- Native mobile application rollout for instant SOS features.

