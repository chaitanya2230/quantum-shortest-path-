import random

class TrafficSimulator:
    def __init__(self, city_graph):
        self.graph = city_graph.get_live_graph()

    def simulate_random_spikes(self, num_spikes=5, severity=3.0):
        """
        Inject traffic anomalies into random intersections/edges of the map.
        Severity multiplies the base travel time.
        """
        edges = list(self.graph.edges())
        spiked_edges = random.sample(edges, min(num_spikes, len(edges)))
        
        for u, v in spiked_edges:
            self.graph[u][v]['current_time'] = self.graph[u][v]['base_time'] * severity
            
        return spiked_edges

    def clear_traffic(self):
        """Return all edges to their base travel times."""
        for u, v in self.graph.edges():
            self.graph[u][v]['current_time'] = self.graph[u][v]['base_time']
