arr = [5, 3, 8, 1, 9, 2, 7]

def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]

bubble_sort(arr)
print("sorted")
