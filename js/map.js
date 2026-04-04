// ═══════════════════════════════════════
// MAP MODULE — Leaflet with dark CartoDB tiles
// + Google services for data
// ═══════════════════════════════════════

let leafletMap, currentTileLayer;
let userMarker, ambMarker;
let userLat, userLng, ambLat, ambLng;
let hospitalMarkers = [];
let routePolylines = [];

// Tile providers
const TILES = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attr: '© CartoDB © OSM',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr: '© Esri',
    },
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attr: '© OpenStreetMap',
    },
};

function initMap(lat, lng) {
    userLat = lat;
    userLng = lng;

    leafletMap = L.map('map', {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
    });

    // Default: Dark theme tiles
    currentTileLayer = L.tileLayer(TILES.dark.url, { maxZoom: 19, attribution: TILES.dark.attr }).addTo(leafletMap);

    // User marker — pulsing blue circle
    const userIcon = L.divIcon({
        html: `<div style="
            width:22px;height:22px;border-radius:50%;
            background:radial-gradient(circle,#38bdf8 30%,#1d4ed8 100%);
            border:3px solid rgba(255,255,255,0.9);
            box-shadow:0 0 12px rgba(56,189,248,0.7),0 0 24px rgba(56,189,248,0.3);
            animation:userPulse 2s ease-in-out infinite;
        "></div>
        <style>@keyframes userPulse{0%,100%{box-shadow:0 0 12px rgba(56,189,248,0.7)}50%{box-shadow:0 0 28px rgba(56,189,248,0.95)}}</style>`,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });
    userMarker = L.marker([lat, lng], { icon: userIcon, draggable: true, zIndexOffset: 2000 }).addTo(leafletMap);
    userMarker.bindPopup('<div style="font-family:Inter,sans-serif"><strong>👤 You (Patient)</strong><br><span style="color:#888">Drag this pin to adjust your precise location!</span></div>').openPopup();

    userMarker.on('dragend', function (e) {
        const position = userMarker.getLatLng();
        userLat = position.lat;
        userLng = position.lng;
        
        // Update UI Panel
        const uLatDom = document.getElementById('uLat');
        const uLngDom = document.getElementById('uLng');
        if (uLatDom) uLatDom.textContent = userLat.toFixed(6);
        if (uLngDom) uLngDom.textContent = userLng.toFixed(6);
        
        const uAccDom = document.getElementById('uAcc');
        if (uAccDom) uAccDom.textContent = 'Manual Drag';

        // Notify user computing hospitals
        document.getElementById('overlayText').textContent = 'Location moved. Re-computing hospital zones...';
        document.getElementById('overlay').classList.remove('hide');
        findHospitals(userLat, userLng);
    });
    // Ambulance base — ~1.5km away
    const angle = Math.random() * Math.PI * 2;
    ambLat = lat + 0.012 * Math.cos(angle);
    ambLng = lng + 0.012 * Math.sin(angle);

    const ambIcon = L.divIcon({
        html: '<div style="font-size:26px;text-shadow:0 2px 8px rgba(0,0,0,0.5);filter:drop-shadow(0 0 6px rgba(34,197,94,0.5))">🚑</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
    ambMarker = L.marker([ambLat, ambLng], { icon: ambIcon, zIndexOffset: 500 }).addTo(leafletMap);
    ambMarker.bindPopup('<div style="font-family:Inter,sans-serif"><strong>🚑 Ambulance Base</strong><br><span style="color:#888">Station nearby</span></div>');

    updateStatus('mapDot', 'g', 'mapText', 'Map Live');
}

// Place hospital markers on map
function placeHospitalMarkers(hospitals) {
    hospitalMarkers.forEach(m => leafletMap.removeLayer(m));
    hospitalMarkers = [];

    hospitals.forEach((h, i) => {
        const isTop = h.rating >= 4.0;
        const isMid = h.rating >= 3.0;
        const color = isTop ? '#22c55e' : (isMid ? '#3b82f6' : '#94a3b8');
        const size = isTop ? 14 : (isMid ? 11 : 9);
        const glow = isTop ? `0 0 8px ${color}90` : `0 0 4px ${color}60`;

        // Circle marker
        const icon = L.divIcon({
            html: `<div style="
                width:${size}px;height:${size}px;border-radius:50%;
                background:${color};border:2px solid rgba(255,255,255,0.8);
                box-shadow:${glow};
            "></div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([h.lat, h.lng], { icon, zIndexOffset: 100 + i }).addTo(leafletMap);

        const statusHtml = h.isOpen === true ? '🟢 Open Now' : (h.isOpen === false ? '🔴 Closed' : '⚪ Unknown');
        const stars = h.rating ? `${'⭐'.repeat(Math.round(h.rating))} ${h.rating}` : 'No rating';
        marker.bindPopup(`<div style="font-family:Inter,sans-serif;max-width:200px">
            <strong style="font-size:13px">🏥 ${h.name}</strong><br>
            <span style="color:#888;font-size:11px">${h.vicinity}</span><br>
            <span style="font-size:12px">${stars} (${h.totalRatings})</span><br>
            <span style="font-size:12px">${statusHtml}</span><br>
            <strong style="font-size:12px;color:#38bdf8">${h.dist.toFixed(1)} km away</strong>
        </div>`);

        // Name label for top 8 hospitals
        if (i < 8) {
            const label = L.marker([h.lat, h.lng], {
                icon: L.divIcon({
                    html: `<div style="
                        background:rgba(0,0,0,0.85);color:#fff;
                        padding:2px 7px;border-radius:4px;
                        font-size:9px;font-family:Inter,sans-serif;
                        white-space:nowrap;font-weight:600;
                        border:1px solid ${color}80;
                        transform:translateY(-18px);
                        box-shadow:0 2px 8px rgba(0,0,0,0.4);
                    ">${h.name}</div>`,
                    className: '',
                    iconAnchor: [0, 0],
                }),
                zIndexOffset: 50 + i,
            }).addTo(leafletMap);
            hospitalMarkers.push(label);
        }

        marker.on('click', () => selectHospital(i));
        hospitalMarkers.push(marker);
    });
}

// Fit bounds
function fitMapBounds(points) {
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    leafletMap.fitBounds(bounds, { padding: [80, 420], maxZoom: 15 });
}

// Clear routes
function clearRoutePolylines() {
    routePolylines.forEach(p => leafletMap.removeLayer(p));
    routePolylines = [];
}

// Draw route on Leaflet from an array of [lat, lng] points
function drawRoute(path, color, weight, opacity, dashArray) {
    const line = L.polyline(path, {
        color, weight, opacity,
        dashArray: dashArray || null,
        lineCap: 'round',
        lineJoin: 'round',
    }).addTo(leafletMap);
    routePolylines.push(line);
    return path;
}

// Switch tile layer
function switchTile(type) {
    document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (currentTileLayer) leafletMap.removeLayer(currentTileLayer);
    const tile = TILES[type];
    currentTileLayer = L.tileLayer(tile.url, { maxZoom: 19, attribution: tile.attr }).addTo(leafletMap);
}
