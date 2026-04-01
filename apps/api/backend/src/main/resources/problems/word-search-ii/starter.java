import java.util.*;

public class Main {
    private char[][] board = {
        {'o','a','a','n'},
        {'e','t','a','e'},
        {'i','h','k','r'},
        {'i','f','l','v'}
    };
    private String[] words = {"oath", "pea", "eat", "rain"};

    public static void main(String[] args) {
        Main m = new Main();
        System.out.println(m.findWords(m.board, m.words));
    }

    public List<String> findWords(char[][] board, String[] words) {
        // TODO: implement
        return new ArrayList<>();
    }
}
