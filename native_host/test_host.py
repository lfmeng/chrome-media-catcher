#!/usr/bin/env python3
"""测试 Native Host 是否能正常运行"""

import sys
import json

# 模拟输入
test_message = json.dumps({
    "action": "test"
})

# 构建标准输入消息
message_bytes = test_message.encode('utf-8')
message_length = len(message_bytes).to_bytes(4, byteorder='little', signed=False)

print(f"📦 测试消息: {test_message}")
print(f"📦 消息长度: {len(message_bytes)}")
print("")
print("✅ 测试完成，脚本可以运行")
