public class Main {
    private Object[][] children;
    private boolean[] isEnd;
    private int nodeCount;

    public static void main(String[] args) {
        Main m = new Main();
        m.init();
        m.insert("apple");
        System.out.println(m.search("apple"));
        System.out.println(m.search("app"));
        System.out.println(m.startsWith("app"));
        m.insert("app");
        System.out.println(m.search("app"));
    }

    public void init() {
        children = new Object[10000][26];
        isEnd = new boolean[10000];
        nodeCount = 1;
    }

    public void insert(String word) {
        // TODO: implement
    }

    public boolean search(String word) {
        // TODO: implement
        return false;
    }

    public boolean startsWith(String prefix) {
        // TODO: implement
        return false;
    }
}
