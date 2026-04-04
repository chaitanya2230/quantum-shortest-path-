import networkx as nx

class ClassicalRouter:
    def __init__(self, city_graph):
        self.graph = city_graph.get_live_graph()
        
    def get_shortest_path(self, origin, destination):
        """
        Calculate the shortest path using Dijkstra's algorithm.
        Optimizes strictly for 'current_time' (live traffic).
        """
        try:
            path = nx.dijkstra_path(self.graph, source=origin, target=destination, weight='current_time')
            length = nx.dijkstra_path_length(self.graph, source=origin, target=destination, weight='current_time')
            return path, length
        except nx.NetworkXNoPath:
            return None, float('inf')
