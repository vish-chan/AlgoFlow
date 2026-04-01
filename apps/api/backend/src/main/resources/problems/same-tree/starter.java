import com.algoflow.annotation.Tree;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;
        TreeNode(int val) { this.val = val; }
    }

    @Tree
    TreeNode p;

    public static void main(String[] args) {
        Main m = new Main();
        m.p = new TreeNode(1);
        m.p.left = new TreeNode(2);
        m.p.right = new TreeNode(3);
        TreeNode q = new TreeNode(1);
        q.left = new TreeNode(2);
        q.right = new TreeNode(3);
        System.out.println(m.isSameTree(m.p, q));
    }

    public boolean isSameTree(TreeNode p, TreeNode q) {
        // TODO: implement
        return false;
    }
}
