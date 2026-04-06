arr = [1, 3, 5, 7, 9, 11, 13, 15, 17]

def binary_search(a, target):
    lo = 0
    hi = len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        elif a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

result = binary_search(arr, 7)
print("found at", result)
