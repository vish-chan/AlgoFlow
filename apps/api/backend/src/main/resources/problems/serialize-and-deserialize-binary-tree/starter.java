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
        m.root = new TreeNode(1);
        m.root.left = new TreeNode(2);
        m.root.right = new TreeNode(3);
        m.root.right.left = new TreeNode(4);
        m.root.right.right = new TreeNode(5);
        String data = m.serialize(m.root);
        System.out.println(data);
        m.root = m.deserialize(data);
    }

    public String serialize(TreeNode root) {
        // TODO: implement
        return "";
    }

    public TreeNode deserialize(String data) {
        // TODO: implement
        return null;
    }
}
