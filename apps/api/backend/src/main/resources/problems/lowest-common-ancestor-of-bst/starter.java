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

    public static void main(String[] args) {
        Main m = new Main();
        m.root = new TreeNode(6);
        m.root.left = new TreeNode(2);
        m.root.right = new TreeNode(8);
        m.root.left.left = new TreeNode(0);
        m.root.left.right = new TreeNode(4);
        m.root.right.left = new TreeNode(7);
        m.root.right.right = new TreeNode(9);
        m.root.left.right.left = new TreeNode(3);
        m.root.left.right.right = new TreeNode(5);
        TreeNode lca = m.lowestCommonAncestor(m.root, m.root.left, m.root.right);
        System.out.println(lca != null ? lca.val : "null");
    }

    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        // TODO: implement
        return null;
    }
}
