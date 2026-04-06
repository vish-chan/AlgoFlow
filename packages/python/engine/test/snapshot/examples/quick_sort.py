arr = [5, 3, 8, 1, 9, 2, 7]

def quick_sort(a, lo, hi):
    if lo < hi:
        p = partition(a, lo, hi)
        quick_sort(a, lo, p - 1)
        quick_sort(a, p + 1, hi)

def partition(a, lo, hi):
    pivot = a[lo]
    i, j = lo + 1, hi
    while True:
        while i <= j and a[i] <= pivot:
            i += 1
        while i <= j and a[j] > pivot:
            j -= 1
        if i >= j:
            break
        a[i], a[j] = a[j], a[i]
    a[lo], a[j] = a[j], a[lo]
    return j

quick_sort(arr, 0, len(arr) - 1)
