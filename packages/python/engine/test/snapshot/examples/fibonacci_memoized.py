memo = {}

def fib(n):
    if n <= 1:
        return n
    if n in memo:
        return memo[n]
    result = fib(n - 1) + fib(n - 2)
    memo[n] = result
    return result

fib(10)
print("fib(10) =", memo[10])
