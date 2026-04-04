class TrafficSignalController:
    def __init__(self, city_graph):
        self.graph = city_graph.get_live_graph()

    def activate_green_corridor(self, route_path):
        """
        Simulate adaptive traffic signals by prioritizing the ambulance path.
        Vastly reduces travel times along the prioritized active edges.
        """
        time_saved_total = 0.0
        
        for i in range(len(route_path) - 1):
            u, v = route_path[i], route_path[i+1]
            original_time = self.graph[u][v]['current_time']
            
            # Make the road extremely fast (clear traffic)
            self.graph[u][v]['current_time'] = self.graph[u][v]['base_time'] * 0.15
            time_saved_total += (original_time - self.graph[u][v]['current_time'])
            
        return time_saved_total
