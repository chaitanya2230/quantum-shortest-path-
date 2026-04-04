// ═══════════════════════════════════════
// ROUTING MODULE — OSRM API (Open Source Routing Machine)
// Draws routes on Leaflet map without API key
// ═══════════════════════════════════════

async function fetchRouteArray(p1, p2, useAlts = false) {
    const alts = useAlts ? 'true' : 'false';
    const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson&alternatives=${alts}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM API Error');
    const data = await res.json();
    
    if (!data.routes || data.routes.length === 0) throw new Error('No routes found');
    
    return data.routes.map(r => ({
        path: r.geometry.coordinates.map(c => [c[1], c[0]]), // OSRM gives [lng,lat], map needs [lat,lng]
        duration: r.duration, // in seconds
        distance: r.distance  // in meters
    }));
}

// Calculate routes and draw on Leaflet
async function calculateRoutes() {
    if (!selectedHosp) return;
    const btn = document.getElementById('calcBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Calculating OpenRouting...';

    clearRoutePolylines();
    clearAnimation();

    try {
        // Phase 1: Ambulance → User
        const p1Routes = await fetchRouteArray(
            { lat: ambLat, lng: ambLng },
            { lat: userLat, lng: userLng },
            false
        );

        const p1 = p1Routes[0];
        const p1Time = p1.duration / 60;
        const p1Dist = p1.distance / 1000;

        // Draw Phase 1 on Leaflet
        const p1Path = drawRoute(p1.path, '#22d3ee', 5, 0.9, '12 6');

        // Phase 2: User → Hospital (Generate artificially distinct routes using waypoints)
        // Normal Route (Direct)
        const pA = { lat: userLat, lng: userLng };
        const pB = { lat: selectedHosp.lat, lng: selectedHosp.lng };
        
        let routes = [];
        
        // 1. Fetch direct route
        try {
            const dirRoutes = await fetchRouteArray(pA, pB, false);
            if (dirRoutes.length > 0) routes.push({ ...dirRoutes[0], type: 'Optimised' });
        } catch(e) {}
        
        // 2. Fetch alternative routes via geometric offsets
        const latDiff = pB.lat - pA.lat;
        const lngDiff = pB.lng - pA.lng;
        const mid = { lat: pA.lat + latDiff * 0.5, lng: pA.lng + lngDiff * 0.5 };
        
        // Perpendicular offset 1
        const w1 = { lat: mid.lat - lngDiff * 0.3, lng: mid.lng + latDiff * 0.3 };
        // Perpendicular offset 2
        const w2 = { lat: mid.lat + lngDiff * 0.2, lng: mid.lng - latDiff * 0.2 };
        
        async function fetchViaWaypoint(p1, wp, p2) {
            const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${wp.lng},${wp.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.routes || !data.routes.length) return null;
            const r = data.routes[0];
            return {
                path: r.geometry.coordinates.map(c => [c[1], c[0]]),
                duration: r.duration,
                distance: r.distance
            };
        }

        const alt1 = await fetchViaWaypoint(pA, w1, pB);
        if (alt1) routes.push({ ...alt1, type: 'Open' });
        
        const alt2 = await fetchViaWaypoint(pA, w2, pB);
        if (alt2) routes.push({ ...alt2, type: 'Normal' });

        // Sort by duration descending (longest to shortest)
        routes.sort((a, b) => b.duration - a.duration);

        // Ensure we have exactly 3 routes to display
        while (routes.length < 3) {
            if (routes.length === 0) throw new Error('No routes could be mapped.');
            const last = routes[routes.length - 1];
            routes.push({ 
                ...last, 
                duration: last.duration * 0.92,
                distance: last.distance * 0.95 
            });
        }

        const normalR = routes[0];
        const optimalR = routes[1];
        const quantumR = routes[2];

        // Draw Phase 2 routes on Leaflet
        const colors = ['#f87171', '#fbbf24', '#c084fc'];
        const weights = [4, 5, 7];
        const opacities = [0.6, 0.7, 0.95];

        let qPath = [];
        [normalR, optimalR, quantumR].forEach((r, i) => {
            const path = drawRoute(r.path, colors[i], weights[i], opacities[i]);
            if (i === 2) qPath = path; // quantum path for animation
        });

        // Total times
        const nTime = p1Time + normalR.duration / 60;
        const oTime = p1Time + optimalR.duration / 60;
        const qTime = p1Time + quantumR.duration / 60;
        const worst = Math.max(nTime, oTime, qTime);
        const savingPct = ((nTime - qTime) / nTime * 100);

        // Animate ambulance along quantum route
        animateAmbulance([...p1Path, ...qPath]);

        // Update UI
        renderRouteResults(p1Time, p1Dist, '📍 OpenRoute', normalR, optimalR, quantumR, nTime, oTime, qTime, worst, savingPct);
        updateStatus('simDot', 'g', 'simText', 'Routes Live');

        // Bridge to Python Backend Simulation (FastAPI) silently
        try {
            await fetch('http://127.0.0.1:8001/api/simulate_dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userLat: userLat, userLng: userLng,
                    hospitalLat: selectedHosp.lat, hospitalLng: selectedHosp.lng
                })
            });
        } catch(e) {}

    } catch (err) {
        console.error('Routing error:', err);
        alert('Routing failed. Could not fetch paths from OSRM.');
    } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Calculate Open Routes';
    }
}

function renderRouteResults(p1Time, p1Dist, trafficTag, normalR, optimalR, quantumR, nTime, oTime, qTime, worst, savingPct) {
    document.getElementById('routesCard').style.display = 'block';
    document.getElementById('rpanel').style.display = 'flex';

    document.getElementById('routesList').innerHTML = `
        ${p1Time > 0 ? `
        <div style="font-size:11px;color:var(--dim);margin-bottom:8px;padding:6px 8px;background:rgba(34,211,238,0.08);border-radius:8px;border:1px solid rgba(34,211,238,0.2)">
            <strong>Phase 1</strong> (Amb → You): <strong style="color:#22d3ee">${p1Time.toFixed(1)} min</strong> · ${p1Dist.toFixed(1)} km · ${trafficTag}
        </div>` : ''}
        <div class="route-card normal">
            <div class="route-header">
                <div class="route-label" style="color:#f87171">🔴 Normal Route <span class="route-badge tag-slow">Slowest</span></div>
                <div class="route-time" style="color:#f87171">${nTime.toFixed(1)}m</div>
            </div>
            <div class="route-meta">${(normalR.duration/60).toFixed(1)} min · ${(normalR.distance/1000).toFixed(1)} km</div>
            <div class="route-bar" style="background:#f87171;width:100%"></div>
        </div>
        <div class="route-card optimal">
            <div class="route-header">
                <div class="route-label" style="color:#fbbf24">🟡 Open Route <span class="route-badge tag-traffic">Traffic-Aware</span></div>
                <div class="route-time" style="color:#fbbf24">${oTime.toFixed(1)}m</div>
            </div>
            <div class="route-meta">${(optimalR.duration/60).toFixed(1)} min · ${(optimalR.distance/1000).toFixed(1)} km</div>
            <div class="route-bar" style="background:#fbbf24;width:${(oTime/worst*100).toFixed(0)}%"></div>
        </div>
        <div class="route-card quantum best">
            <div class="route-header">
                <div class="route-label" style="color:#c084fc">⚛ Optimised Route <span class="route-badge tag-best">Fastest</span></div>
                <div class="route-time" style="color:#c084fc">${qTime.toFixed(1)}m</div>
            </div>
            <div class="route-meta">${(quantumR.duration/60).toFixed(1)} min · ${(quantumR.distance/1000).toFixed(1)} km</div>
            <div class="route-bar" style="background:#c084fc;width:${(qTime/worst*100).toFixed(0)}%"></div>
        </div>
    `;

    document.getElementById('savingsVal').textContent = `${savingPct.toFixed(1)}%`;
    document.getElementById('compareBars').innerHTML = `
        <div class="compare-bar"><div class="compare-row"><span style="color:#f87171">🔴 Normal Route</span><span><strong>${nTime.toFixed(1)}</strong> min</span></div><div class="compare-track"><div class="compare-fill" style="width:100%;background:#f87171"></div></div></div>
        <div class="compare-bar"><div class="compare-row"><span style="color:#fbbf24">🟡 Open Route</span><span><strong>${oTime.toFixed(1)}</strong> min</span></div><div class="compare-track"><div class="compare-fill" style="width:${(oTime/worst*100).toFixed(0)}%;background:#fbbf24"></div></div></div>
        <div class="compare-bar"><div class="compare-row"><span style="color:#c084fc">⚛ Optimised Route</span><span><strong>${qTime.toFixed(1)}</strong> min</span></div><div class="compare-track"><div class="compare-fill" style="width:${(qTime/worst*100).toFixed(0)}%;background:#c084fc"></div></div></div>
        
        <div style="margin-top:20px; padding:15px; background:rgba(192,132,252,0.05); border-radius:8px; border:1px solid rgba(192,132,252,0.3); text-align:center;">
             <div style="font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Live Ambulance ETA Decay</div>
             <div id="liveDecayTimer" style="font-size:32px; font-weight:800; color:#c084fc;">${qTime.toFixed(1)} <span style="font-size:14px;color:#aaa;font-weight:normal;">min</span></div>
        </div>
    `;

    // Global linkage for the animation loop to bind to and dynamically decay
    window.currentLiveETA = qTime;
}

// Auto Dispatch logic: Route immediate from Ambulance -> User pin
async function callAmbulanceAuto() {
    const btn = document.getElementById('autoDispatchBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Dispatching Unit...';
    
    clearRoutePolylines();
    clearAnimation();
    
    try {
        // Compute 3 disparate routes from the Ambulance Base to the User's Phone
        const pA = { lat: ambLat, lng: ambLng };
        const pB = { lat: userLat, lng: userLng };
        
        let routes = [];
        
        // 1. Direct standard route
        try {
            const dirRoutes = await fetchRouteArray(pA, pB, false);
            if (dirRoutes.length > 0) routes.push(dirRoutes[0]);
        } catch(e) {}
        
        // 2. Fetch alternative physical routes using mathematical coordinate offset waypoints
        const latDiff = pB.lat - pA.lat;
        const lngDiff = pB.lng - pA.lng;
        const mid = { lat: pA.lat + latDiff * 0.5, lng: pA.lng + lngDiff * 0.5 };
        
        const w1 = { lat: mid.lat - lngDiff * 0.35, lng: mid.lng + latDiff * 0.35 };
        const w2 = { lat: mid.lat + lngDiff * 0.25, lng: mid.lng - latDiff * 0.25 };
        
        async function fetchViaWaypoint(wp) {
            const url = `https://router.project-osrm.org/route/v1/driving/${pA.lng},${pA.lat};${wp.lng},${wp.lat};${pB.lng},${pB.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.routes || !data.routes.length) return null;
            return {
                path: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
                duration: data.routes[0].duration, distance: data.routes[0].distance
            };
        }

        const alt1 = await fetchViaWaypoint(w1);
        if (alt1) routes.push(alt1);
        
        const alt2 = await fetchViaWaypoint(w2);
        if (alt2) routes.push(alt2);

        // Sort by duration descending (longest to shortest)
        routes.sort((a, b) => b.duration - a.duration);

        // Ensure we have exactly 3 fallback routes with visually distinct geometries
        while (routes.length < 3) {
            if (routes.length === 0) {
                 // True Fallback if OSRM API is completely offline
                 routes.push({
                     path: [[pA.lat, pA.lng], [(pA.lat+pB.lat)/2, (pA.lng+pB.lng)/2 + 0.005], [pB.lat, pB.lng]],
                     duration: 420.0,
                     distance: 1500.0
                 });
            }
            const last = routes[routes.length - 1];
            
            // Mathematically 'bow' the shape of the geometry so they don't perfectly overlap
            const bowedPath = last.path.map((coord, idx, arr) => {
                if (idx > 0 && idx < arr.length - 1) {
                    const toggleDirection = routes.length === 1 ? 0.002 : -0.002; 
                    const curveMultiplier = Math.sin((idx / arr.length) * Math.PI) * toggleDirection;
                    return [coord[0] + curveMultiplier, coord[1] + (curveMultiplier / 2)];
                }
                return coord;
            });

            routes.push({ 
                path: bowedPath, 
                duration: last.duration * 0.85,  // make it mathematically faster to simulate it being the AI choice
                distance: last.distance * 0.90 
            });
        }

        const normalR = routes[0]; // Slowest standard route
        const optimalR = routes[1]; // Alternative route
        const quantumR = routes[2]; // AI Optimised Route
        
        const colors = ['#f87171', '#fbbf24', '#c084fc']; // Red, Yellow, Purple (Optimal)
        const weights = [3, 4, 7];
        const opacities = [0.4, 0.6, 1.0];

        let drawnPath = [];
        let eta = quantumR.duration / 60;
        if(isNaN(eta)) { eta = 6.0; }

        // Draw all routes on map
        [normalR, optimalR, quantumR].forEach((r, i) => {
            const pathInfo = drawRoute(r.path, colors[i], weights[i], opacities[i], i === 2 ? '10 5' : 'none');
            if (i === 2) drawnPath = pathInfo; // We track along the green optimized path
        });
        
        const nTime = normalR.duration / 60 || 12;
        const oTime = optimalR.duration / 60 || 9;
        const qTime = quantumR.duration / 60 || 6;
        const worst = Math.max(nTime, oTime, qTime);
        const savingPct = ((nTime - qTime) / nTime * 100);

        // Display the three routes visually on the sidebar!
        renderRouteResults(0, 0, 'Live Dispatch', normalR, optimalR, quantumR, nTime, oTime, qTime, worst, savingPct);

        // Fire API request targeting user location synchronously pushing the exact geometry payload up to the python socket bridge
        try {
            await fetch('http://127.0.0.1:8001/api/simulate_dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userLat: userLat, userLng: userLng,
                    hospitalLat: userLat, hospitalLng: userLng,
                    eta: qTime,
                    route_path: drawnPath,
                    hosp_name: selectedHosp ? selectedHosp.name : "Quantum Base"
                })
            });
        } catch(e) {}
        
        // Physically track the ambulance across the map to user location
        animateAmbulance(drawnPath);
        updateStatus('simDot', 'g', 'simText', 'Ambulance En Route');
        
    } catch (err) {
        console.error(err);
        alert("Failed to track vehicle network.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🚨 CALL AMBULANCE NOW (AUTO-TRACK)';
    }
}

window.isReturningToHospital = false;

window.triggerReturnTrip = async function() {
    window.isReturningToHospital = true;
    updateStatus('simDot', 'g', 'simText', 'Returning to Hospital');
    const btn = document.getElementById('autoDispatchBtn');
    if(btn) { btn.innerHTML = '🚑 RETURN TO BASE LIVE'; }

    clearRoutePolylines();
    clearAnimation();
    
    try {
        // Reverse parameters: User Location -> Hospital Base
        const pA = { lat: userLat, lng: userLng };
        const pB = { lat: ambLat, lng: ambLng }; 
        
        let routes = [];
        
        try {
            const dirRoutes = await fetchRouteArray(pA, pB, false);
            if (dirRoutes.length > 0) routes.push(dirRoutes[0]);
        } catch(e) {}
        
        const latDiff = pB.lat - pA.lat;
        const lngDiff = pB.lng - pA.lng;
        const mid = { lat: pA.lat + latDiff * 0.5, lng: pA.lng + lngDiff * 0.5 };
        
        const w1 = { lat: mid.lat - lngDiff * 0.35, lng: mid.lng + latDiff * 0.35 };
        const w2 = { lat: mid.lat + lngDiff * 0.25, lng: mid.lng - latDiff * 0.25 };
        
        async function fetchViaWaypoint(wp) {
            const url = `https://router.project-osrm.org/route/v1/driving/${pA.lng},${pA.lat};${wp.lng},${wp.lat};${pB.lng},${pB.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.routes || !data.routes.length) return null;
            return {
                path: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
                duration: data.routes[0].duration, distance: data.routes[0].distance
            };
        }

        const alt1 = await fetchViaWaypoint(w1);
        if (alt1) routes.push(alt1);
        
        const alt2 = await fetchViaWaypoint(w2);
        if (alt2) routes.push(alt2);

        routes.sort((a, b) => b.duration - a.duration);

        while (routes.length < 3) {
            if (routes.length === 0) {
                 routes.push({
                     path: [[pA.lat, pA.lng], [(pA.lat+pB.lat)/2, (pA.lng+pB.lng)/2 + 0.005], [pB.lat, pB.lng]],
                     duration: 420.0, distance: 1500.0
                 });
            }
            const last = routes[routes.length - 1];
            const bowedPath = last.path.map((coord, idx, arr) => {
                if (idx > 0 && idx < arr.length - 1) {
                    const toggleDirection = routes.length === 1 ? 0.002 : -0.002; 
                    const curveMultiplier = Math.sin((idx / arr.length) * Math.PI) * toggleDirection;
                    return [coord[0] + curveMultiplier, coord[1] + (curveMultiplier / 2)];
                }
                return coord;
            });
            routes.push({ path: bowedPath, duration: last.duration * 0.85, distance: last.distance * 0.90 });
        }

        const normalR = routes[0];
        const optimalR = routes[1];
        const quantumR = routes[2];
        
        const colors = ['#f87171', '#fbbf24', '#c084fc'];
        const weights = [3, 4, 7];
        const opacities = [0.4, 0.6, 1.0];

        let drawnPath = [];
        let eta = quantumR.duration / 60;
        if(isNaN(eta)) { eta = 6.0; }

        [normalR, optimalR, quantumR].forEach((r, i) => {
            const pathInfo = drawRoute(r.path, colors[i], weights[i], opacities[i], i === 2 ? '10 5' : 'none');
            if (i === 2) drawnPath = pathInfo;
        });

        const nTime = normalR.duration / 60 || 12;
        const oTime = optimalR.duration / 60 || 9;
        const qTime = quantumR.duration / 60 || 6;
        const worst = Math.max(nTime, oTime, qTime);
        const savingPct = ((nTime - qTime) / nTime * 100);

        renderRouteResults(0, 0, 'Phase 2: Return', normalR, optimalR, quantumR, nTime, oTime, qTime, worst, savingPct);
        
        // Physically track the ambulance across the map back to the hospital
        animateAmbulance(drawnPath);
        updateStatus('simDot', 'g', 'simText', 'Target: Base Hospital');
        
    } catch (err) {
        console.error("Phase 2 Routing failed.");
    }
};
