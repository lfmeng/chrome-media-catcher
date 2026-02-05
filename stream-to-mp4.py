#!/usr/bin/env python3
"""
视频流转 MP4 转换工具

功能描述：支持将各种流媒体格式（m3u8、ts、m4s、mpd等）转换为标准MP4格式

创建日期：2026-02-01
创建者：Claude Code
依赖库：ffmpeg (需系统安装)

使用示例：
    # 转换 m3u8 流
    python stream-to-mp4.py https://example.com/video.m3u8

    # 指定输出文件名
    python stream-to-mp4.py https://example.com/video.m3u8 -o myvideo.mp4

    # 转换 ts 文件
    python stream-to-mp4.py video.ts -o output.mp4

    # 批量转换（从文件读取URL列表）
    python stream-to-mp4.py --batch urls.txt
"""

import sys
import subprocess
import argparse
import os
from pathlib import Path
from urllib.parse import urlparse
import threading
import time


class StreamConverter:
    """视频流转换器"""

    def __init__(self):
        self.ffmpeg_installed = self.check_ffmpeg()

    def check_ffmpeg(self):
        """检查 FFmpeg 是否安装"""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                # 提取版本信息
                version_line = result.stdout.split('\n')[0]
                print(f"✅ 检测到 {version_line}")
                return True
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"⚠️  检查 FFmpeg 时出错: {e}")

        return False

    def detect_stream_type(self, url_or_file):
        """
        检测流媒体类型

        Args:
            url_or_file: URL 或文件路径

        Returns:
            流类型字符串
        """
        lower_path = url_or_file.lower()

        if '.m3u8' in lower_path or '.m3u' in lower_path:
            return 'hls'
        elif '.mpd' in lower_path or '.dash' in lower_path:
            return 'dash'
        elif lower_path.endswith('.ts'):
            return 'mpegts'
        elif lower_path.endswith('.m4s'):
            return 'm4s'
        else:
            return 'unknown'

    def generate_output_filename(self, input_path, output_name=None):
        """
        生成输出文件名

        Args:
            input_path: 输入路径
            output_name: 指定的输出文件名（可选）

        Returns:
            输出文件名
        """
        if output_name:
            # 确保输出文件名以 .mp4 结尾
            if not output_name.lower().endswith('.mp4'):
                output_name += '.mp4'
            return output_name

        # 从输入路径生成文件名
        if os.path.exists(input_path):
            # 本地文件
            basename = os.path.basename(input_path)
        else:
            # URL
            parsed = urlparse(input_path)
            path = parsed.path
            basename = os.path.basename(path) if path else 'video'

        # 移除原扩展名
        name_without_ext = os.path.splitext(basename)[0]
        if not name_without_ext:
            name_without_ext = 'video'

        return f"{name_without_ext}.mp4"

    def convert_hls(self, url, output_file, progress_callback=None):
        """
        转换 HLS (m3u8) 流

        Args:
            url: m3u8 URL
            output_file: 输出文件路径
            progress_callback: 进度回调函数

        Returns:
            是否成功
        """
        print(f"\n🎬 开始转换 HLS 流: {url}")
        print(f"📁 输出文件: {output_file}\n")

        cmd = [
            'ffmpeg',
            '-i', url,
            '-c', 'copy',           # 直接复制，不重新编码
            '-bsf:a', 'aac_adtstoasc',  # 修复 AAC 流
            '-movflags', 'faststart',  # 优化网络播放
            output_file,
            '-y'  # 覆盖已存在的文件
        ]

        return self._run_ffmpeg(cmd, progress_callback)

    def convert_mpegts(self, input_file, output_file, progress_callback=None):
        """
        转换 MPEG-TS 文件

        Args:
            input_file: TS 文件路径或URL
            output_file: 输出文件路径
            progress_callback: 进度回调函数

        Returns:
            是否成功
        """
        print(f"\n🎬 开始转换 MPEG-TS: {input_file}")
        print(f"📁 输出文件: {output_file}\n")

        cmd = [
            'ffmpeg',
            '-i', input_file,
            '-c', 'copy',
            '-bsf:a', 'aac_adtstoasc',
            '-movflags', 'faststart',
            output_file,
            '-y'
        ]

        return self._run_ffmpeg(cmd, progress_callback)

    def convert_m4s(self, input_file, output_file, progress_callback=None):
        """
        转换 M4S 文件（DASH 分片）

        Args:
            input_file: M4S 文件路径
            output_file: 输出文件路径
            progress_callback: 进度回调函数

        Returns:
            是否成功
        """
        print(f"\n🎬 开始转换 M4S: {input_file}")
        print(f"📁 输出文件: {output_file}\n")

        cmd = [
            'ffmpeg',
            '-i', input_file,
            '-c', 'copy',
            '-bsf:a', 'aac_adtstoasc',
            '-movflags', 'faststart',
            output_file,
            '-y'
        ]

        return self._run_ffmpeg(cmd, progress_callback)

    def convert_generic(self, input_path, output_file, progress_callback=None):
        """
        通用视频转换（让 FFmpeg 自动检测格式）

        Args:
            input_path: 输入路径
            output_file: 输出文件路径
            progress_callback: 进度回调函数

        Returns:
            是否成功
        """
        print(f"\n🎬 开始转换: {input_path}")
        print(f"📁 输出文件: {output_file}\n")

        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c', 'copy',
            '-movflags', 'faststart',
            output_file,
            '-y'
        ]

        return self._run_ffmpeg(cmd, progress_callback)

    def _run_ffmpeg(self, cmd, progress_callback=None):
        """
        运行 FFmpeg 命令

        Args:
            cmd: FFmpeg 命令列表
            progress_callback: 进度回调函数

        Returns:
            是否成功
        """
        try:
            # 启动 FFmpeg 进程
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )

            # 实时读取输出
            for line in process.stderr:
                print(line, end='', flush=True)
                if progress_callback:
                    progress_callback(line)

            # 等待进程结束
            process.wait()

            if process.returncode == 0:
                print("\n✅ 转换成功！")
                return True
            else:
                print(f"\n❌ 转换失败，错误代码: {process.returncode}")
                return False

        except KeyboardInterrupt:
            print("\n⚠️  用户中断转换")
            try:
                process.terminate()
            except:
                pass
            return False
        except Exception as e:
            print(f"\n❌ 转换出错: {e}")
            return False

    def convert(self, input_path, output_file=None):
        """
        自动检测并转换视频流

        Args:
            input_path: 输入路径（URL 或文件）
            output_file: 输出文件路径（可选）

        Returns:
            是否成功
        """
        if not self.ffmpeg_installed:
            print("❌ 错误: 未找到 FFmpeg")
            print("\n请先安装 FFmpeg:")
            print("  macOS:   brew install ffmpeg")
            print("  Ubuntu:  sudo apt install ffmpeg")
            print("  Windows: https://ffmpeg.org/download.html")
            return False

        # 检测流类型
        stream_type = self.detect_stream_type(input_path)
        print(f"🔍 检测到流类型: {stream_type}")

        # 生成输出文件名
        output_file = self.generate_output_filename(input_path, output_file)

        # 根据类型选择转换方法
        if stream_type == 'hls':
            return self.convert_hls(input_path, output_file)
        elif stream_type == 'mpegts':
            return self.convert_mpegts(input_path, output_file)
        elif stream_type == 'm4s':
            return self.convert_m4s(input_path, output_file)
        else:
            print(f"⚠️  未知流类型，尝试通用转换...")
            return self.convert_generic(input_path, output_file)

    def batch_convert(self, urls_file, output_dir=None):
        """
        批量转换视频流

        Args:
            urls_file: 包含 URL 列表的文件
            output_dir: 输出目录（可选）
        """
        if not os.path.exists(urls_file):
            print(f"❌ 错误: URL 文件不存在: {urls_file}")
            return

        print(f"📋 从文件读取 URL 列表: {urls_file}\n")

        with open(urls_file, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f if line.strip()]

        print(f"找到 {len(urls)} 个 URL\n")

        # 设置输出目录
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        # 转换计数
        success_count = 0
        fail_count = 0

        for i, url in enumerate(urls, 1):
            print(f"\n{'='*60}")
            print(f"转换 {i}/{len(urls)}: {url}")
            print(f"{'='*60}")

            # 生成输出文件
            output_file = self.generate_output_filename(url)
            if output_dir:
                output_file = os.path.join(output_dir, output_file)

            # 转换
            if self.convert(url, output_file):
                success_count += 1
            else:
                fail_count += 1

        # 打印统计
        print(f"\n{'='*60}")
        print(f"📊 批量转换完成")
        print(f"  成功: {success_count}")
        print(f"  失败: {fail_count}")
        print(f"  总计: {len(urls)}")
        print(f"{'='*60}\n")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='视频流转 MP4 转换工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
使用示例:
  # 转换 m3u8 流
  python %(prog)s https://example.com/video.m3u8

  # 指定输出文件名
  python %(prog)s https://example.com/video.m3u8 -o myvideo.mp4

  # 转换本地 ts 文件
  python %(prog)s video.ts -o output.mp4

  # 批量转换（URL 列表文件）
  python %(prog)s --batch urls.txt

  # 批量转换并指定输出目录
  python %(prog)s --batch urls.txt -d ./output
        '''
    )

    parser.add_argument(
        'input',
        nargs='?',
        help='输入 URL 或文件路径'
    )

    parser.add_argument(
        '-o', '--output',
        help='输出文件名（默认自动生成）'
    )

    parser.add_argument(
        '-d', '--output-dir',
        help='批量转换时的输出目录'
    )

    parser.add_argument(
        '--batch',
        help='批量转换模式，指定包含 URL 列表的文件'
    )

    args = parser.parse_args()

    # 创建转换器
    converter = StreamConverter()

    # 批量转换模式
    if args.batch:
        converter.batch_convert(args.batch, args.output_dir)
        return

    # 单个转换模式
    if not args.input:
        parser.print_help()
        print("\n❌ 错误: 请提供输入 URL 或文件路径")
        sys.exit(1)

    # 执行转换
    success = converter.convert(args.input, args.output)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
