// ═══════════════════════════════════════
// UTILITIES — Helpers & status updates
// ═══════════════════════════════════════

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateStatus(dotId, dotClass, textId, text) {
    document.getElementById(dotId).className = `dot ${dotClass}`;
    document.getElementById(textId).textContent = text;
}

function resetAll() {
    clearRoutePolylines();
    clearAnimation();
    document.getElementById('routesCard').style.display = 'none';
    document.getElementById('rpanel').style.display = 'none';
    updateStatus('simDot', 'y', 'simText', 'Ready');
    leafletMap.setView([userLat, userLng], 14);
}
