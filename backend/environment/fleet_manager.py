import uuid
import random

class Ambulance:
    def __init__(self, start_node, _id=None):
        self.id = _id or str(uuid.uuid4())[:4]
        self.current_node = start_node
        self.status = "available"  # available, dispatched, en_route
        self.target_emergency_id = None

class FleetManager:
    def __init__(self, city_graph, num_ambulances=3):
        self.city_graph = city_graph
        self.fleet = []
        self._spawn_fleet(num_ambulances)
        
    def _spawn_fleet(self, num_ambulances):
        for i in range(num_ambulances):
            node = self.city_graph.get_random_node()
            ambulance = Ambulance(start_node=node, _id=f"AMB-{i+1:02d}")
            self.fleet.append(ambulance)

    def get_available_ambulances(self):
        return [amb for amb in self.fleet if amb.status == "available"]
