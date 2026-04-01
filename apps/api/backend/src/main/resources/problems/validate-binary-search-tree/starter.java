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
        m.root = new TreeNode(5);
        m.root.left = new TreeNode(1);
        m.root.right = new TreeNode(4);
        m.root.right.left = new TreeNode(3);
        m.root.right.right = new TreeNode(6);
        System.out.println(m.isValidBST(m.root));
    }

    public boolean isValidBST(TreeNode root) {
        // TODO: implement
        return false;
    }
}
