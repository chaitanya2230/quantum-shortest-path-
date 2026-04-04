from environment.graph_model import CityGraph
from environment.emergency_api import EmergencyTriggerSystem
from environment.fleet_manager import FleetManager
from simulation.traffic_simulator import TrafficSimulator
from simulation.signal_control import TrafficSignalController
from intelligence.classical_router import ClassicalRouter
from intelligence.quantum_router import QuantumRoutingLayer
from intelligence.explainability import DecisionEngine

def run_full_simulation():
    print("="*60)
    print(" AI & QUANTUM EMERGENCY ROUTING SYSTEM - FULL SIMULATION ")
    print("="*60)
    
    # 1. Environment Build
    print("\n[1] INITIALIZING CITY GRAPH & FLEET...")
    city = CityGraph(size=8)
    fleet_manager = FleetManager(city, num_ambulances=5)
    print(f"    -> City Grid Active: {len(city.graph.nodes)} intersections.")
    print(f"    -> Fleet Deployed: {len(fleet_manager.fleet)} Ambulances.")
    
    # 2. Traffic Spike
    print("\n[2] SIMULATING REAL-TIME TRAFFIC CONDITIONS...")
    traffic_sim = TrafficSimulator(city)
    spiked_roads = traffic_sim.simulate_random_spikes(num_spikes=25, severity=5.0)
    print(f"    -> Severe traffic anomalies injected on {len(spiked_roads)} major roads.")

    # 3. Emergency Call
    print("\n[3] EMERGENCY CALL RECEIVED...")
    emergency_system = EmergencyTriggerSystem(city)
    emergency = emergency_system.simulate_emergency_call()
    
    # 4. Quantum-inspired Optimal Allocation
    print("\n[4] EXECUTING QUANTUM-INSPIRED FLEET ALLOCATION...")
    router = ClassicalRouter(city)
    q_router = QuantumRoutingLayer()
    
    # Simulate single emergency array
    emergencies = [emergency]
    available_ambs = fleet_manager.get_available_ambulances()
    
    allocations = q_router.solve_fleet_allocation_mock(available_ambs, emergencies, router)
    
    if emergency['id'] not in allocations:
        print("    -> [FAILED] No ambulances could reach the destination.")
        return
        
    dispatch_data = allocations[emergency['id']]
    selected_amb = dispatch_data['ambulance']
    initial_eta = dispatch_data['eta']
    
    print(f"    -> Unit {selected_amb.id} automatically selected. Initial projected ETA: {initial_eta:.2f}s")
    
    # 5. Routing & Green Corridor
    print("\n[5] ACTIVATING DYNAMIC ROUTING & GREEN CORRIDOR...")
    path, _ = router.get_shortest_path(selected_amb.current_node, emergency['location'])
    
    signal_controller = TrafficSignalController(city)
    time_saved = signal_controller.activate_green_corridor(path)
    
    # Recalculate ETA with Green Corridor enabled
    _, final_eta = router.get_shortest_path(selected_amb.current_node, emergency['location'])
    
    print(f"    -> Traffic lights overridden. Route cleared! New ETA: {final_eta:.2f}s")
    
    # 6. Explainability
    print("\n[6] DECISION ENGINE REPORT GENERATED:")
    report = DecisionEngine.generate_report(selected_amb, emergency, len(path), time_saved)
    print(report)
    
    print("="*60)
    print(" SIMULATION COMPLETE ")
    print("="*60)

if __name__ == "__main__":
    run_full_simulation()
