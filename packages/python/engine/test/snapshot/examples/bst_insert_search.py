class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(node, val):
    if node is None:
        return TreeNode(val)
    if val < node.val:
        node.left = insert(node.left, val)
    elif val > node.val:
        node.right = insert(node.right, val)
    return node

def search(node, val):
    if node is None:
        return False
    if val == node.val:
        return True
    return search(node.left, val) if val < node.val else search(node.right, val)

root = None
for v in [4, 2, 6, 1, 3, 5, 7]:
    root = insert(root, v)
print("Found 3:", search(root, 3))
print("Found 8:", search(root, 8))
