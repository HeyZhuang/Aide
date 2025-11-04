#!/usr/bin/env python3
"""
统一的日志工具模块
所有 canvas 相关的日志都会写入到 canvas_layer_arrangement.log
"""

import logging
import os
from logging.handlers import RotatingFileHandler

# 创建日志目录
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# 日志文件路径
LOG_FILE = os.path.join(LOG_DIR, "canvas_layer_arrangement.log")

# 创建统一的 logger
canvas_logger = logging.getLogger("canvas_operations")
canvas_logger.setLevel(logging.INFO)

# 防止重复添加处理器
if not canvas_logger.handlers:
    # 文件处理器 - 使用 RotatingFileHandler 自动轮转
    file_handler = RotatingFileHandler(
        filename=LOG_FILE,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=3,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    ))
    
    # 添加处理器
    canvas_logger.addHandler(file_handler)
    canvas_logger.addHandler(console_handler)

def get_logger(name: str = None):
    """
    获取 logger 实例
    
    Args:
        name: logger 名称，如果为 None 则返回默认的 canvas_logger
    
    Returns:
        Logger 实例
    """
    if name:
        logger = logging.getLogger(name)
        # 共享同一个文件处理器
        if not any(isinstance(h, RotatingFileHandler) for h in logger.handlers):
            file_handler = RotatingFileHandler(
                filename=LOG_FILE,
                maxBytes=10*1024*1024,
                backupCount=3,
                encoding='utf-8'
            )
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            logger.addHandler(file_handler)
            logger.setLevel(logging.INFO)
        return logger
    return canvas_logger

