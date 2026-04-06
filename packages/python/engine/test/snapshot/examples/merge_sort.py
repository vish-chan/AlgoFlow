arr = [5, 3, 8, 1, 9, 2, 7]
temp = [0] * len(arr)

def merge_sort(a, t, start, end):
    if start >= end:
        return
    mid = (start + end) // 2
    merge_sort(a, t, start, mid)
    merge_sort(a, t, mid + 1, end)
    merge(a, t, start, mid, end)

def merge(a, t, start, mid, end):
    i, j, k = start, mid + 1, start
    while i <= mid and j <= end:
        if a[i] <= a[j]:
            t[k] = a[i]; i += 1
        else:
            t[k] = a[j]; j += 1
        k += 1
    while i <= mid:
        t[k] = a[i]; i += 1; k += 1
    while j <= end:
        t[k] = a[j]; j += 1; k += 1
    for x in range(start, end + 1):
        a[x] = t[x]

merge_sort(arr, temp, 0, len(arr) - 1)
