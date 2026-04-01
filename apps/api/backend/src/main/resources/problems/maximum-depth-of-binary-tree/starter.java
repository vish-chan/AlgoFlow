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
        m.root = new TreeNode(3);
        m.root.left = new TreeNode(9);
        m.root.right = new TreeNode(20);
        m.root.right.left = new TreeNode(15);
        m.root.right.right = new TreeNode(7);
        System.out.println(m.maxDepth(m.root));
    }

    public int maxDepth(TreeNode root) {
        // TODO: implement
        return 0;
    }
}
