import networkx as nx
import random

class CityGraph:
    def __init__(self, size=10):
        """Generate a realistic city grid graph."""
        self.size = size
        # Creates a 2D grid graph representing city blocks
        self.graph = nx.grid_2d_graph(size, size)
        self._initialize_traffic_weights()

    def _initialize_traffic_weights(self):
        """Assign base and current travel times to edges."""
        for u, v in self.graph.edges():
            # Base travel time in seconds
            base_time = random.uniform(10.0, 30.0) 
            # Current live weight gets updated by traffic simulator
            self.graph[u][v]['base_time'] = base_time
            self.graph[u][v]['current_time'] = base_time
            # Distance approximation in meters
            self.graph[u][v]['distance'] = random.uniform(50.0, 200.0)

    def get_live_graph(self):
        """Returns the networkx graph object."""
        return self.graph
        
    def get_random_node(self):
        """Retrieve a random intersection (node) from the city."""
        nodes = list(self.graph.nodes())
        return random.choice(nodes)
