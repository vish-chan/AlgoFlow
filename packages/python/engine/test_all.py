arr = [5, 2, 8, 1, 4]
scores = {"alice": 90, "bob": 80}

# 1. contains (in operator)
if 2 in arr:
    pass

if "alice" in scores:
    pass

# 2. for-loop iteration over collection
for x in arr:
    pass

# 3. bubble sort — subscript reads + tuple swap + locals
def bubble_sort(a):
    n = len(a)
    for i in range(n):
        for j in range(0, n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]

bubble_sort(arr)
print("done")
