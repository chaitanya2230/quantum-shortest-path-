from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from pydantic import BaseModel

from api.environment.graph_model import CityGraph
from api.environment.emergency_api import EmergencyTriggerSystem
from api.environment.fleet_manager import FleetManager
from api.simulation.traffic_simulator import TrafficSimulator
from api.simulation.signal_control import TrafficSignalController
from api.intelligence.classical_router import ClassicalRouter
from api.intelligence.quantum_router import QuantumRoutingLayer
from api.intelligence.explainability import DecisionEngine

app = FastAPI(title="Quantum AI Ambulance Local Host API")

# Allow the JS Frontend (localhost:8000) to communicate with this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories for Unified Web Service (Render/Localhost)
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/css", StaticFiles(directory="css"), name="css")

@app.get("/")
def serve_dashboard():
    return FileResponse("index.html")

@app.get("/phone.html")
def serve_mobile():
    return FileResponse("phone.html")

# Keep the simulation state alive in memory
city = CityGraph(size=8)
fleet_manager = FleetManager(city, num_ambulances=5)
traffic_sim = TrafficSimulator(city)
emergency_system = EmergencyTriggerSystem(city)

# Global register to bridge phone callers to the dispatch UI
pending_sos_calls = []

class EmergencyRequest(BaseModel):
    userLat: float
    userLng: float
    hospitalLat: float
    hospitalLng: float
    route_path: list = []
    eta: float = 0.0
    hosp_name: str = "Quantum Dispatch Base"

active_dispatch_state = {
    "active": False,
    "path": [],
    "eta": 0.0,
    "hosp_name": "Quantum Dispatch Base"
}

@app.post("/api/sos_trigger")
def trigger_external_phone_call(req: EmergencyRequest):
    """Called by the external simulated phone app (phone.html)."""
    pending_sos_calls.append({
        "lat": req.userLat,
        "lng": req.userLng,
        "phone": "+1-555-0198"
    })
    return {"status": "SOS Registered."}

@app.get("/api/poll_sos")
def poll_pending_calls():
    """Called by the dispatch dashboard to check for incoming live phone calls."""
    if len(pending_sos_calls) > 0:
        call = pending_sos_calls.pop(0) # Process the most recent call
        return {"status": "incoming_call", "data": call}
    return {"status": "no_calls"}

@app.post("/api/simulate_dispatch")
def trigger_intelligent_dispatch(req: EmergencyRequest):
    # Store exact synced parameters from the dashboard for the phone to consume
    active_dispatch_state["active"] = True
    active_dispatch_state["path"] = req.route_path
    active_dispatch_state["eta"] = req.eta
    active_dispatch_state["hosp_name"] = req.hosp_name

    # 1. Random Spike to make traffic heavy
    traffic_sim.clear_traffic()
    traffic_sim.simulate_random_spikes(num_spikes=15, severity=4.0)
    
    # 2. Trigger the Quantum Logic Routine
    emergency = emergency_system.simulate_emergency_call()
    
    router = ClassicalRouter(city)
    q_router = QuantumRoutingLayer()
    
    allocations = q_router.solve_fleet_allocation_mock(fleet_manager.get_available_ambulances(), [emergency], router)
    
    if emergency['id'] not in allocations:
        return {"error": "All ambulances blocked or unavailable."}
        
    dispatch_data = allocations[emergency['id']]
    selected_amb = dispatch_data['ambulance']
    
    # 3. Apply Green Corridor Intelligence
    path, initial_eta = router.get_shortest_path(selected_amb.current_node, emergency['location'])
    signal_controller = TrafficSignalController(city)
    time_saved = signal_controller.activate_green_corridor(path)
    _, final_eta = router.get_shortest_path(selected_amb.current_node, emergency['location'])
    
    # Generate the formal Explainable AI text
    report = DecisionEngine.generate_report(selected_amb, emergency, len(path), time_saved)
    
    # Reset ambulance for next simulation
    selected_amb.status = "available"
    fleet_manager.fleet.append(selected_amb)
    
    return {
        "status": "success",
        "case_id": emergency['id'],
        "assigned_ambulance": selected_amb.id,
        "initial_eta_seconds": initial_eta,
        "optimized_eta_seconds": final_eta,
        "time_saved_seconds": time_saved,
        "explainability_report": report
    }

@app.get("/api/dispatch_status/{case_id}")
def get_dispatch_status(case_id: str):
    return {
        "case_id": case_id,
        "ambLat": 17.7110,
        "ambLng": 83.1660,
        "eta_minutes": 5.2,
        "status": "en_route"
    }

@app.get("/api/active_dispatch")
def get_active_dispatch():
    """Endpoint for phone to poll the exact geometry constructed by the dashboard."""
    return active_dispatch_state

if __name__ == "__main__":
    print("🚀 Quantum Backend API booting on http://0.0.0.0:8001 ...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
