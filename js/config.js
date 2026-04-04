// ═══════════════════════════════════════
// QUANTUM EMERGENCY ROUTING — CONFIG
// ═══════════════════════════════════════
const CONFIG = {
    GOOGLE_API_KEY: 'AIzaSyBPmj7_FIt239paR7LIS6z6Vk_iIQNjsYI',
    SEARCH_RADIUS: 15000,     // 15km hospital search radius
    ANIMATION_DELAY: 180,     // 180ms per animation frame to dramatically slow the ambulance
    TRAIL_INTERVAL: 4,        // trail dot step rate adjusted for slower movement
    MAX_ANIM_STEPS: 1200,     // force the engine to process way more micro-steps without skipping
    DEFAULT_LOCATION: { lat: 17.7046, lng: 83.2926, name: 'Visakhapatnam' },
};
