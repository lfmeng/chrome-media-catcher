#!/usr/bin/env python3
"""
Chrome 媒体资源捕获器 - 图标生成器

功能描述：生成插件的多个尺寸图标和默认占位图

创建日期：2026-02-05
创建者：Claude Code
依赖库：Pillow, cairosvg

使用示例：
    python generate-icons.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_gradient_background(width, height, color1=(102, 126, 234), color2=(118, 75, 162)):
    """创建渐变背景"""
    image = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(image)

    # 垂直渐变
    for y in range(height):
        ratio = y / height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.rectangle([(0, y), (width, y + 1)], fill=(r, g, b))

    return image

def create_rounded_rectangle(draw, bbox, radius, fill=None, outline=None, width=1):
    """绘制圆角矩形

    Args:
        bbox: 可以是 [(x1, y1), (x2, y2)] 或 [x1, y1, x2, y2]
    """
    # 统一bbox格式
    if len(bbox) == 2 and isinstance(bbox[0], tuple):
        x1, y1 = bbox[0]
        x2, y2 = bbox[1]
    else:
        x1, y1, x2, y2 = bbox

    r = radius

    # 绘制四个角
    if fill:
        # 填充模式
        draw.rectangle([x1 + r, y1, x2 - r, y2], fill=fill)
        draw.rectangle([x1, y1 + r, x2, y2 - r], fill=fill)
        draw.pieslice([x1, y1, x1 + 2*r, y1 + 2*r], 180, 270, fill=fill)
        draw.pieslice([x2 - 2*r, y1, x2, y1 + 2*r], 270, 360, fill=fill)
        draw.pieslice([x1, y2 - 2*r, x1 + 2*r, y2], 90, 180, fill=fill)
        draw.pieslice([x2 - 2*r, y2 - 2*r, x2, y2], 0, 90, fill=fill)
    if outline:
        # 描边模式
        draw.arc([x1, y1, x1 + 2*r, y1 + 2*r], 180, 270, fill=outline, width=width)
        draw.arc([x2 - 2*r, y1, x2, y1 + 2*r], 270, 360, fill=outline, width=width)
        draw.arc([x1, y2 - 2*r, x1 + 2*r, y2], 90, 180, fill=outline, width=width)
        draw.arc([x2 - 2*r, y2 - 2*r, x2, y2], 0, 90, fill=outline, width=width)
        draw.line([x1 + r, y1, x2 - r, y1], fill=outline, width=width)
        draw.line([x1 + r, y2, x2 - r, y2], fill=outline, width=width)
        draw.line([x1, y1 + r, x1, y2 - r], fill=outline, width=width)
        draw.line([x2, y1 + r, x2, y2 - r], fill=outline, width=width)

def create_plugin_icon(size):
    """创建插件图标 - 组合相机和下载符号"""
    # 创建圆角矩形背景
    image = create_gradient_background(size, size)

    # 圆角矩形裁剪
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = size // 5
    create_rounded_rectangle(mask_draw, [(0, 0), (size, size)], corner_radius, fill=255)

    # 应用圆角
    result = Image.new('RGB', (size, size), (255, 255, 255))
    result.paste(image, (0, 0), mask)

    # 绘制图标符号
    draw = ImageDraw.Draw(result)
    center = size // 2
    white = (255, 255, 255)

    # 绘制相机图标（简化版）
    camera_size = size // 3
    margin = size // 6

    # 相机主体
    camera_left = margin
    camera_right = size - margin
    camera_top = center - camera_size // 2
    camera_bottom = center + camera_size // 2

    # 矩形主体
    create_rounded_rectangle(
        draw,
        [camera_left, camera_top, camera_right, camera_bottom],
        radius=size // 15,
        outline=white,
        width=max(2, size // 16)
    )

    # 镜头圆圈
    lens_radius = camera_size // 3
    lens_center = (center, center)
    draw.ellipse(
        [
            lens_center[0] - lens_radius,
            lens_center[1] - lens_radius,
            lens_center[0] + lens_radius,
            lens_center[1] + lens_radius
        ],
        outline=white,
        width=max(2, size // 16)
    )

    # 下载箭头（在相机下方）
    arrow_size = size // 5
    arrow_y = camera_bottom + size // 10

    # 箭头竖线
    draw.line(
        [(center, arrow_y), (center, arrow_y + arrow_size)],
        fill=white,
        width=max(2, size // 16)
    )

    # 箭头横线
    draw.line(
        [(center - arrow_size // 2, arrow_y + arrow_size),
         (center + arrow_size // 2, arrow_y + arrow_size)],
        fill=white,
        width=max(2, size // 16)
    )

    return result

def create_placeholder_image(width, height):
    """创建默认占位图"""
    # 创建浅灰色背景
    image = Image.new('RGB', (width, height), (245, 245, 245))
    draw = ImageDraw.Draw(image)

    # 绘制边框
    border_color = (200, 200, 200)
    draw.rectangle(
        [(2, 2), (width - 3, height - 3)],
        outline=border_color,
        width=2
    )

    # 绘制图片图标（山形 + 圆形太阳）
    center_x = width // 2
    center_y = height // 2
    icon_color = (180, 180, 180)

    # 山形
    mountain_size = min(width, height) // 4
    draw.polygon([
        (center_x - mountain_size, center_y),
        (center_x, center_y - mountain_size // 2),
        (center_x + mountain_size, center_y)
    ], outline=icon_color, width=max(1, width // 64))

    # 太阳圆圈
    sun_radius = mountain_size // 3
    draw.ellipse(
        [
            center_x + mountain_size // 2,
            center_y - mountain_size,
            center_x + mountain_size // 2 + sun_radius * 2,
            center_y - mountain_size + sun_radius * 2
        ],
        outline=icon_color,
        width=max(1, width // 64)
    )

    # 添加文字
    try:
        # 尝试使用系统字体
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", max(10, width // 16))
    except:
        # 如果找不到字体，使用默认字体
        font = ImageFont.load_default()

    text = "图片加载失败"
    # 获取文字边界
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]

    # 绘制文字
    draw.text(
        (center_x - text_width // 2, height - center_y // 2),
        text,
        fill=(150, 150, 150),
        font=font
    )

    return image

def main():
    """主函数"""
    print("🎨 开始生成图标...")

    # 确保icons目录存在
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    # 生成插件图标
    sizes = [16, 48, 128]
    for size in sizes:
        print(f"  生成 {size}x{size} 图标...")
        icon = create_plugin_icon(size)
        icon_path = os.path.join(icons_dir, f'icon{size}.png')
        icon.save(icon_path, 'PNG')
        print(f"  ✅ 已保存: {icon_path}")

    # 生成默认占位图（多个尺寸）
    print("\n🖼️  生成默认占位图...")
    placeholder_sizes = [
        (200, 150),  # 小尺寸
        (400, 300),  # 中等尺寸
        (800, 600)   # 大尺寸
    ]

    for width, height in placeholder_sizes:
        print(f"  生成 {width}x{height} 占位图...")
        placeholder = create_placeholder_image(width, height)
        placeholder_path = os.path.join(icons_dir, f'placeholder-{width}x{height}.png')
        placeholder.save(placeholder_path, 'PNG')
        print(f"  ✅ 已保存: {placeholder_path}")

    # 生成SVG版本（便于进一步编辑）
    print("\n📐 生成SVG矢量图标...")
    svg_path = os.path.join(icons_dir, 'icon.svg')
    svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- 背景圆角矩形 -->
  <rect width="128" height="128" rx="25" fill="url(#grad)"/>

  <!-- 相机图标 -->
  <g transform="translate(64, 54)">
    <!-- 相机主体 -->
    <rect x="-35" y="-20" width="70" height="40" rx="5"
          fill="none" stroke="white" stroke-width="4"/>

    <!-- 镜头 -->
    <circle cx="0" cy="0" r="12" fill="none" stroke="white" stroke-width="4"/>
  </g>

  <!-- 下载箭头 -->
  <g transform="translate(64, 90)">
    <line x1="0" y1="0" x2="0" y2="15" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <line x1="-8" y1="15" x2="8" y2="15" stroke="white" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>'''

    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"  ✅ 已保存: {svg_path}")

    print("\n✨ 所有图标生成完成！")
    print(f"📁 图标目录: {icons_dir}")
    print("\n生成的文件:")
    print("  插件图标:")
    for size in sizes:
        print(f"    - icon{size}.png")
    print("  默认占位图:")
    for width, height in placeholder_sizes:
        print(f"    - placeholder-{width}x{height}.png")
    print("  矢量图标:")
    print("    - icon.svg")

if __name__ == "__main__":
    main()
