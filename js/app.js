// ═══════════════════════════════════════
// APP — Main entry point
// ═══════════════════════════════════════

function initApp() {
    updateStatus('placesDot', 'b', 'placesText', 'API Ready');
    
    // Explicitly block laptops and wait entirely for the Mobile App Signal
    document.getElementById('overlayText').innerHTML = 'Global Tracking Offline.<br><br>Waiting for Emergency Dispatch Signal from Mobile Phone...<br><span style="font-size:12px;color:#888;">(Dial the Emergency number on your phone to trigger satellite map)</span>';
    
    document.getElementById('uLat').textContent = "—";
    document.getElementById('uLng').textContent = "—";
    document.getElementById('uAcc').textContent = "—";
    document.getElementById('uStatus').textContent = 'AWAITING CALL...';
    updateStatus('gpsDot', 'y', 'gpsText', 'Phone Offline');
    
    // Start strictly listening to the network
    startPhoneListener();
}

let isMapLive = false;

// Interconnect simulated mobile phones (phone.html) to this central Dashboard
function startPhoneListener() {
    console.log("Listening for raw external phone SOS bounds...");
    
    setInterval(async () => {
        try {
            const res = await fetch('/api/poll_sos');
            if (res.ok) {
                const data = await res.json();
                if (data.status === "incoming_call") {
                    console.log("URGENT! Phone Call Intercepted!");
                    
                    userLat = data.data.lat;
                    userLng = data.data.lng;
                    
                    document.getElementById('uLat').textContent = userLat.toFixed(6);
                    document.getElementById('uLng').textContent = userLng.toFixed(6);
                    document.getElementById('uAcc').textContent = 'Secure Network';
                    document.getElementById('uStatus').textContent = '🚨 SIGNAL INTERCEPTED';
                    document.getElementById('uStatus').style.color = '#ef4444';
                    updateStatus('gpsDot', 'g', 'gpsText', 'Phone Linked');
                    
                    if (!isMapLive) {
                        isMapLive = true;
                        // Build Map directly at the phone's coordinates!
                        initMap(userLat, userLng);
                    } else {
                        userMarker.setLatLng([userLat, userLng]);
                        leafletMap.flyTo([userLat, userLng], 15);
                    }
                    
                    // Fetch authentic hospitals around the new phone zone
                    await findHospitals(userLat, userLng);
                    
                    // Snap the ambulance instantly to the nearest actual hospital!
                    if (typeof displayedHospitals !== 'undefined' && displayedHospitals.length > 0) {
                        let sortedHospitals = [...displayedHospitals].sort((a, b) => {
                            let distA = Math.pow(a.lat - userLat, 2) + Math.pow(a.lng - userLng, 2);
                            let distB = Math.pow(b.lat - userLat, 2) + Math.pow(b.lng - userLng, 2);
                            return distA - distB;
                        });
                        
                        ambLat = sortedHospitals[0].lat;
                        ambLng = sortedHospitals[0].lng;
                        ambMarker.setLatLng([ambLat, ambLng]);
                        
                        // Store exactly the metadata so the JSON Socket bridge can send it to the mobile phone
                        if (typeof selectedHosp !== 'undefined') {
                            selectedHosp = sortedHospitals[0];
                        }
                    } else {
                        // Fallback in case OSM fails
                        const angle = Math.random() * Math.PI * 2;
                        ambLat = userLat + 0.012 * Math.cos(angle);
                        ambLng = userLng + 0.012 * Math.sin(angle);
                        ambMarker.setLatLng([ambLat, ambLng]);
                    }
                    
                    // Dispatch the unit dynamically after routing snaps to the hospital
                    setTimeout(() => { callAmbulanceAuto(); }, 500);
                }
            }
        } catch(e) {
            // Backend offline, skip silently
        }
    }, 2000); // Check every 2 seconds
}
