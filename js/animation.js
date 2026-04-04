// ═══════════════════════════════════════
// ANIMATION MODULE — Ambulance movement on Leaflet
// ═══════════════════════════════════════

let ambulanceAnimId = null;
let ambulanceMarker = null;
let trailMarkers = [];

function animateAmbulance(path) {
    clearAnimation();
    if (!path || path.length < 2) return;

    // Ambulance marker
    const ambIcon = L.divIcon({
        html: '<div style="font-size:30px;text-shadow:0 2px 10px rgba(0,0,0,0.6);filter:drop-shadow(0 0 8px rgba(34,197,94,0.6))">🚑</div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
    ambulanceMarker = L.marker(path[0], { icon: ambIcon, zIndexOffset: 5000 }).addTo(leafletMap);

    const totalPts = path.length;
    const step = Math.max(1, Math.floor(totalPts / CONFIG.MAX_ANIM_STEPS));
    let idx = 0, lastT = 0, trailCt = 0;

    function tick(ts) {
        if (idx >= totalPts) {
            // Arrival flash!
            ambulanceMarker.setIcon(L.divIcon({
                html: '<div style="font-size:32px;text-shadow:0 0 20px #22c55e,0 0 40px #22c55e,0 0 60px #22c55e">🚑</div>',
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            }));
            // Arrival ring
            const arrivalCircle = L.circle(path[totalPts - 1], {
                radius: 100, fillColor: '#22c55e', fillOpacity: 0.15,
                color: '#22c55e', weight: 2, opacity: 0.5,
            }).addTo(leafletMap);
            trailMarkers.push(arrivalCircle);
            setTimeout(() => { try { leafletMap.removeLayer(arrivalCircle); } catch(e){} }, 4000);
            return;
        }
        if (ts - lastT < CONFIG.ANIMATION_DELAY) {
            ambulanceAnimId = requestAnimationFrame(tick);
            return;
        }
        lastT = ts;
        
        // Dynamically decay the UI Live ETA timer based on mathematical track progress
        const progress = Math.min(1, idx / totalPts);
        const timerEl = document.getElementById('liveDecayTimer');
        if (timerEl && typeof window.currentLiveETA !== 'undefined') {
            const timeRemaining = window.currentLiveETA * (1 - progress);
            timerEl.innerHTML = `${Math.max(0, timeRemaining).toFixed(1)} <span style="font-size:14px;color:#aaa;font-weight:normal;">min</span>`;
        }

        ambulanceMarker.setLatLng(path[idx]);

        // Trail dots
        trailCt++;
        if (trailCt % CONFIG.TRAIL_INTERVAL === 0) {
            const dot = L.circleMarker(path[idx], {
                radius: 3, fillColor: '#22c55e', fillOpacity: 0.5,
                stroke: false,
            }).addTo(leafletMap);
            trailMarkers.push(dot);
            setTimeout(() => dot.setStyle({ fillOpacity: 0.15, radius: 2 }), 2000);
            setTimeout(() => { try { leafletMap.removeLayer(dot); } catch(e){} }, 6000);
        }

        idx += step;
        ambulanceAnimId = requestAnimationFrame(tick);
    }

    setTimeout(() => { ambulanceAnimId = requestAnimationFrame(tick); }, 600);
}

function clearAnimation() {
    if (ambulanceAnimId) cancelAnimationFrame(ambulanceAnimId);
    ambulanceAnimId = null;
    if (ambulanceMarker) { try { leafletMap.removeLayer(ambulanceMarker); } catch(e){} ambulanceMarker = null; }
    trailMarkers.forEach(t => { try { leafletMap.removeLayer(t); } catch(e){} });
    trailMarkers = [];
}
