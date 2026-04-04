import uuid
from datetime import datetime

class EmergencyTriggerSystem:
    def __init__(self, city_graph):
        self.city_graph = city_graph
        self.active_emergencies = {}

    def simulate_emergency_call(self):
        """
        Simulate an incoming emergency request.
        Generates a Case ID and assigns a random incident node.
        """
        case_id = str(uuid.uuid4())[:8]
        incident_node = self.city_graph.get_random_node()
        
        emergency_data = {
            "id": case_id,
            "timestamp": datetime.now().isoformat(),
            "location": incident_node,
            "status": "pending_dispatch"
        }
        
        self.active_emergencies[case_id] = emergency_data
        print(f"[EMERGENCY ALERT] Case #{case_id} registered at intersection {incident_node}.")
        return emergency_data
