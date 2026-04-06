arr = [5, 3, 8, 1, 9, 2, 7]

def linear_search(a, target):
    for i in range(len(a)):
        if a[i] == target:
            return i
    return -1

result = linear_search(arr, 9)
print("found at", result)
