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
    let startTime = null;
    let trailCt = 0;

    function tick(ts) {
        // Because we calculate global sync securely, elapsedMs is directly tied to global timestamp
        if (typeof window.globalDispatchStartTime === 'undefined') window.globalDispatchStartTime = Date.now();
        const elapsedMs = Date.now() - window.globalDispatchStartTime;
        
        // Exact real-world physical time duration mapping
        const totalDurationMs = (window.currentLiveETA || 6.0) * 60 * 1000;
        const progress = Math.min(1, elapsedMs / totalDurationMs);
        
        if (progress >= 1.0) {
            // Arrival flash!
            ambulanceMarker.setIcon(L.divIcon({
                html: '<div style="font-size:32px;text-shadow:0 0 20px #22c55e,0 0 40px #22c55e,0 0 60px #22c55e">🚑</div>',
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            }));
            const arrivalCircle = L.circle(path[totalPts - 1], {
                radius: 100, fillColor: '#22c55e', fillOpacity: 0.15,
                color: '#22c55e', weight: 2, opacity: 0.5,
            }).addTo(leafletMap);
            trailMarkers.push(arrivalCircle);
            setTimeout(() => { try { leafletMap.removeLayer(arrivalCircle); } catch(e){} }, 4000);
            
            // Phase 2: Trigger Return Trip automatically!
            if (window.triggerReturnTrip && !window.isReturningToHospital) {
                setTimeout(() => window.triggerReturnTrip(), 2000);
            }
            return;
        }
        
        // Dynamically decay the UI Live ETA timer based on absolute clock time
        const timerEl = document.getElementById('liveDecayTimer');
        if (timerEl && typeof window.currentLiveETA !== 'undefined') {
            const timeRemaining = (totalDurationMs - elapsedMs) / 60000; // in minutes
            timerEl.innerHTML = `${Math.max(0, timeRemaining).toFixed(1)} <span style="font-size:14px;color:#aaa;font-weight:normal;">min</span>`;
        }

        // Sub-pixel geographic interpolation for ultra smooth physical real-time driving
        const fineIdx = progress * (totalPts - 1);
        const idx1 = Math.floor(fineIdx);
        const idx2 = Math.min(totalPts - 1, idx1 + 1);
        const ratio = fineIdx - idx1;
        
        const p1 = path[idx1];
        const p2 = path[idx2];
        const currentPos = [
            p1[0] + (p2[0] - p1[0]) * ratio,
            p1[1] + (p2[1] - p1[1]) * ratio
        ];

        ambulanceMarker.setLatLng(currentPos);

        // Trail dots every ~50 frames
        trailCt++;
        if (trailCt % 50 === 0) {
            const dot = L.circleMarker(currentPos, {
                radius: 3, fillColor: '#22c55e', fillOpacity: 0.5,
                stroke: false,
            }).addTo(leafletMap);
            trailMarkers.push(dot);
            setTimeout(() => dot.setStyle({ fillOpacity: 0.15, radius: 2 }), 2000);
            setTimeout(() => { try { leafletMap.removeLayer(dot); } catch(e){} }, 6000);
        }

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
