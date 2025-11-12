"""
Gemini 快速测试脚本

本脚本用于快速验证 Gemini 是否正常工作。
只测试最基础的功能，不会调用 API。

使用方法：
    cd server
    python tests/test_gemini_quick.py
"""

import asyncio
import sys
import os

# 添加 server 目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.config_service import config_service
from services.tool_service import tool_service


async def quick_test():
    """快速测试"""
    print("="*60)
    print("🚀 Gemini 快速测试")
    print("="*60)
    print()

    all_passed = True

    # 测试 1: 检查配置文件
    print("📋 测试 1: 检查配置文件")
    print("-" * 60)

    try:
        await config_service.initialize()

        gemini_config = config_service.app_config.get('gemini')

        if not gemini_config:
            print("❌ 未找到 Gemini 配置")
            print("   请在 server/user_data/config.toml 中添加 [gemini] 配置")
            all_passed = False
        else:
            print("✅ 找到 Gemini 配置")

            # 检查 API Key
            api_key = gemini_config.get('api_key', '')
            use_vertexai = gemini_config.get('use_vertexai', False)

            if api_key:
                print(f"✅ API Key 已配置 ({api_key[:20]}...)")
            elif use_vertexai:
                print("✅ 已启用 Vertex AI")
                project = gemini_config.get('project', '')
                if project:
                    print(f"✅ Vertex AI 项目: {project}")
                else:
                    print("❌ Vertex AI 项目未配置")
                    all_passed = False
            else:
                print("❌ 未配置 API Key 且未启用 Vertex AI")
                print("   请在 config.toml 中设置 api_key 或启用 use_vertexai")
                all_passed = False

    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        all_passed = False

    print()

    # 测试 2: 检查模型配置
    print("📋 测试 2: 检查模型配置")
    print("-" * 60)

    try:
        gemini_config = config_service.app_config.get('gemini', {})
        models = gemini_config.get('models', {})

        # 只检查 Flash 模型（文本和图像）
        expected_models = [
            'gemini-2.5-flash',          # 文本模型
            'gemini-2.5-flash-image',    # 图像模型
        ]

        all_found = True
        for model_name in expected_models:
            if model_name in models:
                model_type = models[model_name].get('type', 'unknown')
                print(f"✅ 模型已配置: {model_name} (type: {model_type})")
            else:
                print(f"❌ 模型未配置: {model_name}")
                all_found = False
                all_passed = False

        if all_found:
            print("\n✅ 所有模型配置正确")

    except Exception as e:
        print(f"❌ 模型配置检查失败: {e}")
        all_passed = False

    print()

    # 测试 3: 检查工具注册
    print("📋 测试 3: 检查工具注册")
    print("-" * 60)

    try:
        await tool_service.initialize()
        all_tools = tool_service.get_all_tools()

        # 只检查 Flash 图像工具
        gemini_tools = {
            'generate_image_by_gemini_2_5_flash': 'Gemini 2.5 Flash Image',
        }

        all_registered = True
        for tool_id, display_name in gemini_tools.items():
            if tool_id in all_tools:
                print(f"✅ 工具已注册: {display_name}")
            else:
                print(f"❌ 工具未注册: {display_name}")
                all_registered = False
                all_passed = False

        if not all_registered:
            print("\n⚠️  提示: 工具注册需要配置 api_key")
            print("   请检查 config.toml 中是否设置了 [gemini] api_key")

    except Exception as e:
        print(f"❌ 工具注册检查失败: {e}")
        all_passed = False

    print()

    # 测试 4: 检查文件是否存在
    print("📋 测试 4: 检查代码文件")
    print("-" * 60)

    # 只检查 Flash 相关文件
    files_to_check = [
        ("Provider", "tools/image_providers/gemini_provider.py"),
        ("Flash 工具", "tools/generate_image_by_gemini_2_5_flash.py"),
    ]

    server_dir = os.path.dirname(os.path.dirname(__file__))

    for file_desc, file_path in files_to_check:
        full_path = os.path.join(server_dir, file_path)
        if os.path.exists(full_path):
            print(f"✅ {file_desc}: {file_path}")
        else:
            print(f"❌ {file_desc}: {file_path} (不存在)")
            all_passed = False

    print()

    # 总结
    print("="*60)
    if all_passed:
        print("✅ 快速测试全部通过!")
        print()
        print("下一步:")
        print("  1. 运行完整测试: python tests/test_gemini_basic.py")
        print("  2. 启动服务器: python main.py")
        print("  3. 在前端测试生成图片")
    else:
        print("❌ 部分测试失败")
        print()
        print("请根据上面的错误信息修复问题，然后重新运行测试")
    print("="*60)

    return all_passed


if __name__ == "__main__":
    success = asyncio.run(quick_test())
    sys.exit(0 if success else 1)
