#!/usr/bin/env python3
"""
字体设置验证脚本
用于检查字体功能是否正确配置
"""

import os
import sys

def check_fonts_directory():
    """检查字体目录是否存在"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    fonts_dir = os.path.join(script_dir, "fonts")
    
    print(f"检查字体目录: {fonts_dir}")
    
    if not os.path.exists(fonts_dir):
        print(f"❌ 字体目录不存在: {fonts_dir}")
        return False
    
    print(f"✅ 字体目录存在: {fonts_dir}")
    
    # 列出字体文件
    font_files = []
    for file in os.listdir(fonts_dir):
        if file.lower().endswith(('.ttf', '.otf', '.woff', '.woff2')):
            font_files.append(file)
            file_path = os.path.join(fonts_dir, file)
            size = os.path.getsize(file_path)
            print(f"  - {file} ({size:,} bytes)")
    
    if not font_files:
        print("❌ 字体目录中没有找到字体文件")
        return False
    
    print(f"✅ 找到 {len(font_files)} 个字体文件")
    return True

def check_server_config():
    """检查服务器配置"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    server_main = os.path.join(script_dir, "server", "main.py")
    
    print(f"\n检查服务器配置: {server_main}")
    
    if not os.path.exists(server_main):
        print(f"❌ 服务器文件不存在: {server_main}")
        return False
    
    with open(server_main, 'r', encoding='utf-8') as f:
        content = f.read()
        
        if 'mount("/fonts"' in content or 'mount("/fonts"' in content:
            print("✅ 服务器配置中包含字体静态文件路由")
        else:
            print("❌ 服务器配置中未找到字体静态文件路由")
            print("   需要在 server/main.py 中添加:")
            print('   app.mount("/fonts", StaticFiles(directory=fonts_dir), name="fonts")')
            return False
    
    return True

def check_frontend_code():
    """检查前端代码"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_component = os.path.join(script_dir, "react", "src", "components", "canvas", "PSDLayerSidebar.tsx")
    
    print(f"\n检查前端代码: {frontend_component}")
    
    if not os.path.exists(frontend_component):
        print(f"❌ 前端组件不存在: {frontend_component}")
        return False
    
    with open(frontend_component, 'r', encoding='utf-8') as f:
        content = f.read()
        
        if 'assetSubTab === \'fonts\'' in content:
            print("✅ 前端代码中包含字体标签页")
        else:
            print("❌ 前端代码中未找到字体标签页代码")
            return False
        
        if 'fontList' in content:
            print("✅ 前端代码中包含字体列表")
        else:
            print("❌ 前端代码中未找到字体列表")
            return False
        
        if 'FontFace' in content:
            print("✅ 前端代码中包含字体加载逻辑")
        else:
            print("❌ 前端代码中未找到字体加载逻辑")
            return False
    
    return True

def main():
    print("=" * 60)
    print("字体功能配置验证")
    print("=" * 60)
    
    results = []
    
    results.append(("字体目录", check_fonts_directory()))
    results.append(("服务器配置", check_server_config()))
    results.append(("前端代码", check_frontend_code()))
    
    print("\n" + "=" * 60)
    print("验证结果总结:")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ 所有检查通过！")
        print("\n如果仍然看不到变化，请检查:")
        print("1. 服务器是否已重启")
        print("2. 前端代码是否已重新构建 (npm run build)")
        print("3. 浏览器是否清除了缓存")
        print("4. 浏览器控制台是否有错误信息")
    else:
        print("❌ 部分检查未通过，请根据上面的提示修复问题")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())





