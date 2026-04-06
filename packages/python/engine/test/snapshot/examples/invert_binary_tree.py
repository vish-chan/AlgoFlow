class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

root = TreeNode(4)
root.left = TreeNode(2)
root.right = TreeNode(7)
root.left.left = TreeNode(1)
root.left.right = TreeNode(3)
root.right.left = TreeNode(6)
root.right.right = TreeNode(9)

def invert(node):
    if node is None:
        return None
    node.left, node.right = invert(node.right), invert(node.left)
    return node

root = invert(root)
