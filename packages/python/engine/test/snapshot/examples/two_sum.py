nums = [2, 7, 11, 15]
seen = {}

def two_sum(nums, target):
    for i in range(len(nums)):
        complement = target - nums[i]
        if complement in seen:
            print("found", seen[complement], i)
            return
        seen[nums[i]] = i

two_sum(nums, 9)
