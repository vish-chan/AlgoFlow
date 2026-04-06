n = 6
queens = [-1] * n

def is_safe(row, col):
    for r in range(row):
        if queens[r] == col or abs(queens[r] - col) == row - r:
            return False
    return True

def solve(row):
    if row == n:
        return True
    for col in range(n):
        if is_safe(row, col):
            queens[row] = col
            if solve(row + 1):
                return True
            queens[row] = -1
    return False

solve(0)
print(queens)
