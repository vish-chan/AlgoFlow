import heapq

adj_matrix = [  # @graph(directed=True, weighted=True)
    [0, 4, 2, 0, 0, 0],
    [0, 0, 8, 0, 0, 0],
    [0, 0, 0, 7, 0, 2],
    [0, 0, 0, 0, 9, 0],
    [0, 0, 0, 0, 0, 10],
    [0, 0, 0, 0, 3, 0],
]

def dijkstra(src):
    n = len(adj_matrix)
    dist = [float('inf')] * n
    dist[src] = 0
    visited = [False] * n
    for _ in range(n):
        u = -1
        for v in range(n):
            if not visited[v] and (u == -1 or dist[v] < dist[u]):
                u = v
        visited[u] = True
        for v in range(n):
            if adj_matrix[u][v] > 0 and dist[u] + adj_matrix[u][v] < dist[v]:
                dist[v] = dist[u] + adj_matrix[u][v]

dijkstra(0)
