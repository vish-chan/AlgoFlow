adj_matrix = [
    [0, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0],
]
visited = [False] * 6
stack = []

def topo_sort():
    for i in range(len(adj_matrix)):
        if not visited[i]:
            dfs(i)
    print(stack[::-1])

def dfs(node):
    visited[node] = True
    for i in range(len(adj_matrix)):
        if adj_matrix[node][i] == 1 and not visited[i]:
            dfs(i)
    stack.append(node)

topo_sort()
