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
        m.root.left = new TreeNode(1);
        m.root.right = new TreeNode(4);
        m.root.left.right = new TreeNode(2);
        System.out.println(m.kthSmallest(m.root, 1));
    }

    public int kthSmallest(TreeNode root, int k) {
        // TODO: implement
        return 0;
    }
}
