"""
Gemini 高级功能测试脚本

本脚本用于测试 Gemini 模型的高级功能，包括：
1. Pro 模型生成
2. 图片编辑（Image-to-Image）
3. 不同宽高比测试
4. 性能基准测试

使用方法：
    cd server
    python tests/test_gemini_advanced.py
"""

import asyncio
import sys
import os
import time

# 添加 server 目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.config_service import config_service, FILES_DIR
from tools.image_providers.gemini_provider import GeminiImageProvider
from PIL import Image


async def test_pro_model():
    """测试 Pro 模型生成"""
    print("\n" + "="*60)
    print("🧪 测试 1: Gemini 2.5 Pro Image 生成")
    print("="*60)

    try:
        provider = GeminiImageProvider()

        print("\n🎨 生成参数:")
        print("   模型: gemini-2.5-pro-image")
        print("   提示词: A beautiful mountain landscape with a lake")
        print("   宽高比: 16:9")

        start_time = time.time()

        mime_type, width, height, filename = await provider.generate(
            prompt="A beautiful mountain landscape with a lake",
            model="gemini-2.5-pro-image",
            aspect_ratio="16:9"
        )

        elapsed = time.time() - start_time

        print(f"\n✅ 生成成功!")
        print(f"   文件名: {filename}")
        print(f"   尺寸: {width}x{height}")
        print(f"   格式: {mime_type}")
        print(f"   耗时: {elapsed:.2f}s")

        return True

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_image_editing():
    """测试图片编辑功能"""
    print("\n" + "="*60)
    print("🧪 测试 2: 图片编辑（Image-to-Image）")
    print("="*60)

    try:
        provider = GeminiImageProvider()

        # 第一步：生成原始图片
        print("\n📸 步骤 1: 生成原始图片")
        print("   提示词: A red apple on a white table")

        _, _, _, original_filename = await provider.generate(
            prompt="A red apple on a white table",
            model="gemini-2.5-flash-image",
            aspect_ratio="1:1"
        )

        print(f"   ✅ 原始图片: {original_filename}")

        # 第二步：编辑图片
        print("\n✏️  步骤 2: 编辑图片")
        print("   提示词: Transform this image to have a blue apple instead")

        original_path = os.path.join(FILES_DIR, original_filename)

        start_time = time.time()

        mime_type, width, height, edited_filename = await provider.generate(
            prompt="Transform this image to have a blue apple instead",
            model="gemini-2.5-flash-image",
            aspect_ratio="1:1",
            input_images=[original_path]
        )

        elapsed = time.time() - start_time

        print(f"\n✅ 编辑成功!")
        print(f"   编辑后文件: {edited_filename}")
        print(f"   尺寸: {width}x{height}")
        print(f"   耗时: {elapsed:.2f}s")

        return True

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_aspect_ratios():
    """测试不同宽高比"""
    print("\n" + "="*60)
    print("🧪 测试 3: 不同宽高比测试")
    print("="*60)

    aspect_ratios = [
        ("1:1", "正方形"),
        ("16:9", "宽屏"),
        ("9:16", "竖屏"),
        ("3:4", "海报"),
    ]

    results = []

    for ratio, description in aspect_ratios:
        print(f"\n📐 测试宽高比: {ratio} ({description})")

        try:
            provider = GeminiImageProvider()

            _, width, height, filename = await provider.generate(
                prompt=f"A simple test image for {ratio} aspect ratio",
                model="gemini-2.5-flash-image",
                aspect_ratio=ratio
            )

            actual_ratio = width / height
            print(f"   ✅ 生成成功: {filename}")
            print(f"   尺寸: {width}x{height}")
            print(f"   实际比例: {actual_ratio:.2f}")

            results.append((ratio, True))

        except Exception as e:
            print(f"   ❌ 失败: {e}")
            results.append((ratio, False))

    # 总结
    print(f"\n{'='*60}")
    print("📊 宽高比测试总结")
    print(f"{'='*60}")

    passed = sum(1 for _, success in results if success)
    total = len(results)

    for ratio, success in results:
        status = "✅ 通过" if success else "❌ 失败"
        print(f"   {ratio}: {status}")

    print(f"\n   通过率: {passed}/{total} ({passed/total*100:.1f}%)")

    return passed == total


async def test_performance():
    """性能基准测试"""
    print("\n" + "="*60)
    print("🧪 测试 4: 性能基准测试")
    print("="*60)

    models = [
        ("gemini-2.5-flash-image", "Flash"),
        ("gemini-2.5-pro-image", "Pro"),
    ]

    results = []

    for model_name, model_display in models:
        print(f"\n⚡ 测试模型: {model_display}")

        try:
            provider = GeminiImageProvider()

            # 运行 3 次取平均值
            times = []
            for i in range(3):
                print(f"   运行 {i+1}/3...", end=" ", flush=True)

                start = time.time()
                await provider.generate(
                    prompt=f"Performance test {i+1}",
                    model=model_name,
                    aspect_ratio="1:1"
                )
                elapsed = time.time() - start

                times.append(elapsed)
                print(f"{elapsed:.2f}s")

            avg_time = sum(times) / len(times)
            min_time = min(times)
            max_time = max(times)

            print(f"\n   📊 统计:")
            print(f"      平均: {avg_time:.2f}s")
            print(f"      最快: {min_time:.2f}s")
            print(f"      最慢: {max_time:.2f}s")

            results.append((model_display, avg_time))

        except Exception as e:
            print(f"   ❌ 失败: {e}")
            results.append((model_display, None))

    # 总结
    print(f"\n{'='*60}")
    print("📊 性能测试总结")
    print(f"{'='*60}")

    for model_display, avg_time in results:
        if avg_time:
            print(f"   {model_display}: 平均 {avg_time:.2f}s")
        else:
            print(f"   {model_display}: 测试失败")

    return all(avg_time is not None for _, avg_time in results)


async def run_all_tests():
    # """运行所有高级测试"""
    # print("="*60)
    # print("🧪 Gemini 高级功能测试")
    # print("="*60)
    # print()
    # print("⚠️  注意: 这些测试会调用 Gemini API，请确保：")
    # print("   1. 已配置有效的 API Key")
    # print("   2. API 配额充足")
    # print("   3. 网络连接正常")
    # print()
    # input("按 Enter 键继续...")

    # 初始化配置
    await config_service.initialize()

    # 运行测试
    tests = [
        ("Pro 模型生成", test_pro_model),
        ("图片编辑", test_image_editing),
        ("不同宽高比", test_aspect_ratios),
        ("性能基准", test_performance),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        success = await test_func()

        if success:
            passed += 1
        else:
            failed += 1

    # 最终总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    print(f"总计: {passed + failed} 个测试")
    print(f"✅ 通过: {passed}")
    print(f"❌ 失败: {failed}")
    print(f"通过率: {(passed/(passed+failed)*100) if (passed+failed) > 0 else 0:.1f}%")
    print("="*60)

    return failed == 0


if __name__ == "__main__":
    print("\n🚀 启动 Gemini 高级测试...\n")

    # 运行测试
    success = asyncio.run(run_all_tests())

    # 返回退出码
    sys.exit(0 if success else 1)
