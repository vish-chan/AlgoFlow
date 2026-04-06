class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

root = TreeNode(4)
root.left = TreeNode(2)
root.right = TreeNode(6)
root.left.left = TreeNode(1)
root.left.right = TreeNode(3)
root.right.left = TreeNode(5)
root.right.right = TreeNode(7)

def inorder(node):
    if node is None:
        return
    inorder(node.left)
    print(node.val)
    inorder(node.right)

inorder(root)
