class DecisionEngine:
    @staticmethod
    def generate_report(selected_amb, emergency, total_nodes, time_saved):
        report = f"""
        🚨 AI DECISION ENGINE EXPLANATION 🚨
        -----------------------------------
        Case ID: #{emergency['id']}
        Selected Unit: {selected_amb.id}
        
        > WHY THIS AMBULANCE? 
        The quantum-inspired optimizer determined {selected_amb.id} had the absolutely lowest ETA considering live map bottlenecks, preventing regional response starvation.
        
        > ROUTE EXPLANATION:
        The fastest path navigated {total_nodes} intersections. 
        Traffic Signal Control (Green Corridor) was preemptively activated ahead of the unit.
        This reduced the projected arrival time by {time_saved:.2f} seconds.
        """
        return report
