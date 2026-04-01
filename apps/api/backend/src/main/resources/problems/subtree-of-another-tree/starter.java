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
        m.root.left = new TreeNode(4);
        m.root.right = new TreeNode(5);
        m.root.left.left = new TreeNode(1);
        m.root.left.right = new TreeNode(2);
        TreeNode subRoot = new TreeNode(4);
        subRoot.left = new TreeNode(1);
        subRoot.right = new TreeNode(2);
        System.out.println(m.isSubtree(m.root, subRoot));
    }

    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        // TODO: implement
        return false;
    }
}
