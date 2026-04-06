adj_matrix = [  # @graph
    [0, 1, 1, 0, 0, 0],
    [1, 0, 0, 1, 1, 0],
    [1, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 1],
    [0, 1, 1, 0, 0, 1],
    [0, 0, 0, 1, 1, 0],
]
visited = [False] * 6

def dfs(node):
    visited[node] = True
    for neighbor in range(len(adj_matrix)):
        if adj_matrix[node][neighbor] == 1 and not visited[neighbor]:
            dfs(neighbor)

dfs(0)
