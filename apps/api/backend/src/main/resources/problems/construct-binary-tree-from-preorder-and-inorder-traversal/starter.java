import com.algoflow.annotation.Tree;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;
        TreeNode(int val) { this.val = val; }
    }

    @Tree
    TreeNode root;

    private int[] preorder = {3, 9, 20, 15, 7};
    private int[] inorder = {9, 3, 15, 20, 7};

    public static void main(String[] args) {
        Main m = new Main();
        m.root = m.buildTree(m.preorder, m.inorder);
    }

    public TreeNode buildTree(int[] preorder, int[] inorder) {
        // TODO: implement
        return null;
    }
}
