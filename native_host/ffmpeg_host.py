#!/usr/bin/env python3
"""
Chrome Media Catcher - Native Host for FFmpeg
接收来自Chrome扩展的消息，调用本地FFmpeg转码视频
"""

import sys
import json
import struct
import subprocess
import os
import tempfile
from pathlib import Path


def read_message():
    """读取来自Chrome扩展的消息"""
    # 读取消息长度（4字节）
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    message_length = struct.unpack('=I', raw_length)[0]

    # 读取消息内容
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message):
    """发送消息到Chrome扩展"""
    encoded_message = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(encoded_message)))
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()


def check_ffmpeg():
    """检查FFmpeg是否安装"""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


def process_m3u8(m3u8_url, output_dir, cookie=None, user_agent=None, referer=None):
    """处理m3u8视频"""
    try:
        # 下载m3u8并转换为MP4
        output_file = os.path.join(output_dir, 'output.mp4')

        # 使用FFmpeg下载并转换
        cmd = [
            'ffmpeg',
            '-i', m3u8_url,
            '-c', 'copy',  # 直接复制，不重新编码
            '-bsf:a', 'aac_adtstoasc',  # 修复AAC流
            '-movflags', 'faststart',  # 优化网络播放
        ]

        # 🔥 添加 User-Agent
        if user_agent:
            cmd.extend(['-user_agent', user_agent])

        # 🔥 添加 Cookie 和 Referer 作为 headers
        headers = []
        if cookie:
            headers.append(f'Cookie: {cookie}')
        if referer:
            headers.append(f'Referer: {referer}')

        if headers:
            cmd.extend(['-headers', '\r\n'.join(headers)])

        cmd.extend([output_file, '-y'])  # 覆盖已存在的文件

        # 🔥 发送进度消息
        send_message({
            'type': 'progress',
            'percent': 10,
            'message': '开始处理 m3u8 流...'
        })

        # 🔥 使用非阻塞方式运行FFmpeg，以便实时获取进度
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        # 读取FFmpeg输出以获取进度
        duration = None
        while True:
            line = process.stderr.readline()
            if not line and process.poll() is not None:
                break

            # 解析视频时长
            if 'Duration:' in line:
                try:
                    time_part = line.split('Duration: ')[1].split(',')[0].strip()
                    h, m, s = time_part.split(':')
                    duration = int(h) * 3600 + int(m) * 60 + float(s)
                except:
                    pass

            # 解析进度
            if duration and 'time=' in line:
                try:
                    time_str = line.split('time=')[1].split(' ')[0].strip()
                    h, m, s = time_str.split(':')
                    current_time = int(h) * 3600 + int(m) * 60 + float(s)
                    percent = int((current_time / duration) * 80) + 10  # 10-90%

                    send_message({
                        'type': 'progress',
                        'percent': min(percent, 90),
                        'message': f'正在转换... {percent}%'
                    })
                except:
                    pass

        returncode = process.wait()

        if returncode == 0 and os.path.exists(output_file):
            # 读取转换后的文件
            with open(output_file, 'rb') as f:
                video_data = f.read()

            # 清理临时文件
            try:
                os.remove(output_file)
            except:
                pass

            return {
                'success': True,
                'type': 'video/mp4',
                'data': list(video_data),  # 转换为JSON可序列化的格式
                'filename': os.path.basename(output_file)
            }
        else:
            return {
                'success': False,
                'error': f'FFmpeg转换失败，返回码: {returncode}'
            }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'FFmpeg执行超时（5分钟）'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'处理失败: {str(e)}'
        }


def process_ts_video(ts_url, output_dir, cookie=None, user_agent=None, referer=None):
    """处理TS视频文件"""
    try:
        # 下载TS文件
        import urllib.request

        temp_ts = os.path.join(output_dir, 'input.ts')
        output_file = os.path.join(output_dir, 'output.mp4')

        # 下载TS文件
        try:
            urllib.request.urlretrieve(ts_url, temp_ts)
        except Exception as e:
            return {
                'success': False,
                'error': f'下载TS文件失败: {str(e)}'
            }

        # 转换为MP4
        cmd = [
            'ffmpeg',
            '-i', temp_ts,
            '-c', 'copy',
            output_file,
            '-y'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )

        # 清理临时TS文件
        try:
            os.remove(temp_ts)
        except:
            pass

        if result.returncode == 0 and os.path.exists(output_file):
            with open(output_file, 'rb') as f:
                video_data = f.read()

            try:
                os.remove(output_file)
            except:
                pass

            return {
                'success': True,
                'type': 'video/mp4',
                'data': list(video_data),
                'filename': os.path.basename(output_file)
            }
        else:
            return {
                'success': False,
                'error': f'FFmpeg转换失败: {result.stderr}'
            }
    except Exception as e:
        return {
            'success': False,
            'error': f'处理失败: {str(e)}'
        }


def process_m4s_video(m4s_url, output_dir, cookie=None, user_agent=None, referer=None):
    """处理M4S视频文件（DASH分片）"""
    try:
        # 下载M4S文件
        import urllib.request

        temp_m4s = os.path.join(output_dir, 'input.m4s')
        output_file = os.path.join(output_dir, 'output.mp4')

        # 下载M4S文件
        try:
            urllib.request.urlretrieve(m4s_url, temp_m4s)
        except Exception as e:
            return {
                'success': False,
                'error': f'下载M4S文件失败: {str(e)}'
            }

        # 转换为MP4
        cmd = [
            'ffmpeg',
            '-i', temp_m4s,
            '-c', 'copy',
            '-bsf:a', 'aac_adtstoasc',
            '-movflags', 'faststart',
            output_file,
            '-y'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )

        # 清理临时M4S文件
        try:
            os.remove(temp_m4s)
        except:
            pass

        if result.returncode == 0 and os.path.exists(output_file):
            with open(output_file, 'rb') as f:
                video_data = f.read()

            try:
                os.remove(output_file)
            except:
                pass

            return {
                'success': True,
                'type': 'video/mp4',
                'data': list(video_data),
                'filename': os.path.basename(output_file)
            }
        else:
            return {
                'success': False,
                'error': f'FFmpeg转换失败: {result.stderr}'
            }
    except Exception as e:
        return {
            'success': False,
            'error': f'处理失败: {str(e)}'
        }

def main():
    """主函数"""
    try:
        # 创建临时目录
        temp_dir = tempfile.mkdtemp(prefix='chrome_media_catcher_')

        while True:
            # 读取消息
            message = read_message()

            if message is None:
                break

            action = message.get('action')
            url = message.get('url', '')
            video_type = message.get('type', '')
            # 🔥 获取 Cookie、User-Agent 和 Referer
            cookie = message.get('cookie', '')
            user_agent = message.get('userAgent', '')
            referer = message.get('referer', '')

            # 检查FFmpeg
            if not check_ffmpeg():
                send_message({
                    'success': False,
                    'error': '未找到FFmpeg，请先安装：https://ffmpeg.org/download.html'
                })
                continue

            # 处理不同类型的视频
            if action == 'convert':
                if video_type == 'hls':
                    result = process_m3u8(url, temp_dir, cookie, user_agent, referer)
                elif video_type == 'mpegts':
                    result = process_ts_video(url, temp_dir, cookie, user_agent, referer)
                elif video_type == 'm4s':
                    result = process_m4s_video(url, temp_dir, cookie, user_agent, referer)
                else:
                    result = {
                        'success': False,
                        'error': f'不支持的视频类型: {video_type}'
                    }
            else:
                result = {
                    'success': False,
                    'error': f'未知的action: {action}'
                }

            # 发送响应
            send_message(result)

    except KeyboardInterrupt:
        pass
    except Exception as e:
        send_message({
            'success': False,
            'error': f'Native Host错误: {str(e)}'
        })


if __name__ == '__main__':
    main()
