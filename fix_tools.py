#!/usr/bin/env python3
"""
批量修复工具文件中的@tool装饰器语法问题
"""

import os
import re
import glob

def fix_tool_file(filepath):
    """修复单个工具文件"""
    print(f"修复文件: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 修复 @tool 装饰器语法
    # 匹配 @tool("name", description="...", args_schema=Schema) 格式
    pattern = r'@tool\(\s*"[^"]*"\s*,\s*description\s*=\s*"[^"]*"\s*,\s*args_schema\s*=\s*([^)]+)\s*\)'
    replacement = r'@tool(args_schema=\1)'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # 修复 @tool("name", description="""...""", args_schema=Schema) 格式
    pattern2 = r'@tool\(\s*"[^"]*"\s*,\s*description\s*=\s*"""[^"]*"""\s*,\s*args_schema\s*=\s*([^)]+)\s*\)'
    replacement2 = r'@tool(args_schema=\1)'
    content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)
    
    # 检查函数是否有docstring，如果没有则添加
    # 查找函数定义
    func_pattern = r'(@tool\(args_schema=[^)]+\))\s*\n\s*(async\s+)?def\s+([^(]+)\([^)]*\)\s*->\s*[^:]+:\s*\n'
    
    def add_docstring(match):
        decorator = match.group(1)
        async_keyword = match.group(2) or ''
        func_name = match.group(3)
        
        # 检查下一行是否已经有docstring
        remaining_content = content[match.end():]
        if remaining_content.strip().startswith('"""') or remaining_content.strip().startswith("'''"):
            return match.group(0)  # 已经有docstring，不修改
        
        # 添加默认docstring
        docstring = f'    """{func_name.replace("_", " ").title()} tool function."""\n'
        return f'{decorator}\n{async_keyword}def {func_name}({match.group(0).split("(", 1)[1].split(")", 1)[0]}) -> {match.group(0).split("->", 1)[1].split(":", 1)[0]}:\n{docstring}'
    
    # 应用修复
    content = re.sub(func_pattern, add_docstring, content)
    
    # 写回文件
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ 修复完成: {filepath}")

def main():
    """主函数"""
    tools_dir = "server/tools"
    
    # 查找所有Python文件
    pattern = os.path.join(tools_dir, "*.py")
    files = glob.glob(pattern)
    
    print(f"找到 {len(files)} 个工具文件")
    
    for filepath in files:
        if os.path.basename(filepath) == "__init__.py":
            continue  # 跳过__init__.py
        
        try:
            fix_tool_file(filepath)
        except Exception as e:
            print(f"❌ 修复失败 {filepath}: {e}")
    
    print("🎉 批量修复完成!")

if __name__ == "__main__":
    main()
