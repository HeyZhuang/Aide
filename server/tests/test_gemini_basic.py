"""
Gemini 基础功能测试脚本

本脚本用于测试 Gemini 模型的基础功能，包括：
1. 配置加载
2. Provider 创建
3. 图片生成
4. 工具注册

生成的图片会保存在：server/tests/generated_images/

使用方法：
    cd server
    python tests/test_gemini_basic.py
"""

import asyncio
import sys
import os
from datetime import datetime

# 添加 server 目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 创建测试图片输出目录
TEST_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "generated_images")
os.makedirs(TEST_OUTPUT_DIR, exist_ok=True)

from services.config_service import config_service
from tools.image_providers.gemini_provider import GeminiImageProvider


class TestResult:
    """测试结果记录器"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def add_pass(self, test_name: str):
        """记录通过的测试"""
        self.passed += 1
        print(f"✅ PASS: {test_name}")

    def add_fail(self, test_name: str, error: str):
        """记录失败的测试"""
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ FAIL: {test_name}")
        print(f"   Error: {error}")

    def print_summary(self):
        """打印测试总结"""
        total = self.passed + self.failed
        print("\n" + "="*60)
        print("📊 测试总结")
        print("="*60)
        print(f"总计: {total} 个测试")
        print(f"✅ 通过: {self.passed}")
        print(f"❌ 失败: {self.failed}")
        print(f"通过率: {(self.passed/total*100) if total > 0 else 0:.1f}%")

        if self.errors:
            print("\n❌ 失败详情:")
            for error in self.errors:
                print(f"  - {error}")

        print("="*60)
        return self.failed == 0


result = TestResult()


async def test_1_config_loading():
    """测试1: 配置文件加载"""
    test_name = "配置文件加载"
    try:
        await config_service.initialize()

        # 检查 Gemini 配置是否存在
        gemini_config = config_service.app_config.get('gemini')

        if not gemini_config:
            result.add_fail(test_name, "未找到 Gemini 配置")
            return False

        # 检查必要字段
        api_key = gemini_config.get('api_key', '')
        use_vertexai = gemini_config.get('use_vertexai', False)

        if not api_key and not use_vertexai:
            result.add_fail(test_name, "未配置 API Key 且未启用 Vertex AI")
            return False

        result.add_pass(test_name)
        return True

    except Exception as e:
        result.add_fail(test_name, str(e))
        return False


async def test_2_provider_creation():
    """测试2: Provider 创建"""
    test_name = "Provider 创建"
    try:
        provider = GeminiImageProvider()

        # 尝试创建客户端
        client = provider._get_client()

        if not client:
            result.add_fail(test_name, "无法创建 Gemini 客户端")
            return False

        result.add_pass(test_name)
        return True

    except Exception as e:
        result.add_fail(test_name, str(e))
        return False


async def test_3_image_generation_flash():
    """测试3: Flash 模型图片生成"""
    test_name = "Flash 模型图片生成"
    try:
        provider = GeminiImageProvider()

        print(f"\n🎨 开始生成图片（Flash 模型）...")
        print(f"   提示词: A simple red circle")
        print(f"   宽高比: 1:1")

        mime_type, width, height, filename = await provider.generate(
            prompt="A simple red circle",
            model="gemini-2.5-flash-image",
            aspect_ratio="1:1"
        )

        print(f"   ✅ 生成成功!")
        print(f"   文件名: {filename}")
        print(f"   尺寸: {width}x{height}")
        print(f"   格式: {mime_type}")

        # 验证返回值
        if not filename:
            result.add_fail(test_name, "未返回文件名")
            return False

        if width <= 0 or height <= 0:
            result.add_fail(test_name, f"无效的图片尺寸: {width}x{height}")
            return False

        # 检查文件是否存在
        from services.config_service import FILES_DIR
        filepath = os.path.join(FILES_DIR, filename)
        if not os.path.exists(filepath):
            result.add_fail(test_name, f"文件不存在: {filepath}")
            return False

        # 复制图片到测试输出目录
        import shutil
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_filename = f"gemini_flash_{timestamp}_{filename}"
        test_filepath = os.path.join(TEST_OUTPUT_DIR, test_filename)
        shutil.copy2(filepath, test_filepath)
        print(f"   📁 测试图片已保存: tests/generated_images/{test_filename}")

        result.add_pass(test_name)
        return True

    except Exception as e:
        result.add_fail(test_name, str(e))
        import traceback
        traceback.print_exc()
        return False


async def test_4_tool_registration():
    """测试4: 工具注册"""
    test_name = "工具注册"
    try:
        from services.tool_service import tool_service

        # 初始化工具服务
        await tool_service.initialize()

        # 获取所有工具
        all_tools = tool_service.get_all_tools()

        # 检查 Gemini 工具是否注册（只检查 Flash 模型）
        gemini_tools = {
            'generate_image_by_gemini_2_5_flash': 'Gemini 2.5 Flash Image',
        }

        missing_tools = []
        for tool_id, display_name in gemini_tools.items():
            if tool_id not in all_tools:
                missing_tools.append(display_name)

        if missing_tools:
            result.add_fail(test_name, f"未注册的工具: {', '.join(missing_tools)}")
            print(f"   提示: 请检查 config.toml 中是否配置了 [gemini] api_key")
            return False

        print(f"\n🔧 已注册的 Gemini 工具:")
        for tool_id, display_name in gemini_tools.items():
            tool_info = all_tools[tool_id]
            print(f"   - {tool_info.get('display_name', tool_id)}")

        result.add_pass(test_name)
        return True

    except Exception as e:
        result.add_fail(test_name, str(e))
        return False


async def test_5_model_config():
    """测试5: 模型配置"""
    test_name = "模型配置"
    try:
        gemini_config = config_service.app_config.get('gemini', {})
        models = gemini_config.get('models', {})

        # 检查模型是否存在（只检查 Flash 模型）
        expected_models = [
            'gemini-2.5-flash',          # 文本模型
            'gemini-2.5-flash-image',    # 图像模型
        ]

        missing_models = []
        for model_name in expected_models:
            if model_name not in models:
                missing_models.append(model_name)

        if missing_models:
            result.add_fail(test_name, f"缺少模型配置: {', '.join(missing_models)}")
            return False

        print(f"\n📋 已配置的 Gemini 模型:")
        for model_name, model_config in models.items():
            print(f"   - {model_name} (type: {model_config.get('type', 'unknown')})")

        result.add_pass(test_name)
        return True

    except Exception as e:
        result.add_fail(test_name, str(e))
        return False


async def run_all_tests():
    """运行所有测试"""
    print("="*60)
    print("🧪 Gemini 模型后端测试")
    print("="*60)
    print()

    # 按顺序运行测试
    tests = [
        ("1. 配置加载", test_1_config_loading),
        ("2. Provider 创建", test_2_provider_creation),
        ("3. 模型配置", test_5_model_config),
        ("4. 工具注册", test_4_tool_registration),
        ("5. Flash 模型生成", test_3_image_generation_flash),
    ]

    for test_desc, test_func in tests:
        print(f"\n{'='*60}")
        print(f"🔍 运行测试: {test_desc}")
        print(f"{'='*60}")

        success = await test_func()

        # 如果前置测试失败，跳过后续测试
        if not success and test_desc in ["1. 配置加载", "2. Provider 创建"]:
            print(f"\n⚠️  前置测试失败，跳过后续测试")
            break

    # 打印总结
    success = result.print_summary()

    return success


if __name__ == "__main__":
    print("\n🚀 启动 Gemini 后端测试...\n")

    # 运行测试
    success = asyncio.run(run_all_tests())

    # 返回退出码
    sys.exit(0 if success else 1)
