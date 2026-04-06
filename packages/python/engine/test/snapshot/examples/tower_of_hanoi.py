def hanoi(n, src, dst, aux):
    if n == 0:
        return
    hanoi(n - 1, src, aux, dst)
    print(f"Move disk {n} from {src} to {dst}")
    hanoi(n - 1, aux, dst, src)

hanoi(4, "A", "C", "B")
