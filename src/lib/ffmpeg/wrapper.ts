import { spawn } from 'child_process';
import { config } from '../../config/env';
import type { VideoMetadata } from '../../types';

export interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  codec?: 'av1' | 'h264' | 'h265';
  quality?: string; // 360p, 480p, 720p, 1080p
  bitrate?: string;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow' | 'veryslow';
  crf?: number; // Constant Rate Factor (0-63 for AV1, lower is better quality)
}

export interface ThumbnailOptions {
  inputPath: string;
  outputPath: string;
  timestamp?: string; // HH:MM:SS format
  width?: number;
  height?: number;
}

/**
 * FFmpeg wrapper class for video processing
 */
export class FFmpegService {
  private static ffmpegPath = config.FFMPEG_PATH;
  private static ffprobePath = config.FFPROBE_PATH;

  /**
   * Execute ffmpeg command
   */
  private static async executeCommand(
    command: string,
    args: string[],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // Parse progress from ffmpeg output
        if (onProgress) {
          const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseInt(timeMatch[3]);
            const currentTime = hours * 3600 + minutes * 60 + seconds;

            // This is a rough estimate - you'd need total duration for accurate percentage
            onProgress(currentTime);
          }
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}\n${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Get video metadata using ffprobe
   */
  static async getMetadata(inputPath: string): Promise<VideoMetadata> {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ];

    try {
      const output = await this.executeCommand(this.ffprobePath, args);
      const data = JSON.parse(output);

      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      return {
        duration: parseFloat(data.format.duration) || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        bitrate: parseInt(data.format.bit_rate) || 0,
        fps: this.parseFps(videoStream.r_frame_rate),
        format: data.format.format_name || 'unknown',
      };
    } catch (error) {
      throw new Error(`Failed to get video metadata: ${error}`);
    }
  }

  /**
   * Parse frame rate from ffprobe output
   */
  private static parseFps(fpsString: string): number {
    if (!fpsString) return 0;
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(fpsString);
  }

  /**
   * Transcode video to different quality/codec
   */
  static async transcode(
    options: TranscodeOptions,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const {
      inputPath,
      outputPath,
      codec = config.DEFAULT_VIDEO_CODEC as 'av1' | 'h264' | 'h265',
      quality,
      bitrate,
      preset = 'medium',
      crf = 30,
    } = options;

    const args = ['-i', inputPath];

    // Video codec settings
    if (codec === 'av1') {
      args.push(
        '-c:v', 'libaom-av1',
        '-crf', crf.toString(),
        '-b:v', '0', // Use CRF mode
        '-cpu-used', this.getAV1CpuUsed(preset),
        '-row-mt', '1',
        '-tiles', '2x2'
      );
    } else if (codec === 'h265') {
      args.push(
        '-c:v', 'libx265',
        '-crf', crf.toString(),
        '-preset', preset
      );
    } else {
      args.push(
        '-c:v', 'libx264',
        '-crf', crf.toString(),
        '-preset', preset
      );
    }

    // Quality/resolution settings
    if (quality) {
      const resolution = this.getResolution(quality);
      if (resolution) {
        args.push('-vf', `scale=${resolution.width}:${resolution.height}`);
      }
    }

    // Bitrate override
    if (bitrate) {
      args.push('-b:v', bitrate);
    }

    // Audio codec
    args.push(
      '-c:a', 'libopus',
      '-b:a', '128k'
    );

    // Output format
    args.push(
      '-f', 'mp4',
      '-movflags', '+faststart', // Enable streaming
      outputPath
    );

    await this.executeCommand(this.ffmpegPath, args, onProgress);
  }

  /**
   * Generate thumbnail from video
   */
  static async generateThumbnail(options: ThumbnailOptions): Promise<void> {
    const {
      inputPath,
      outputPath,
      timestamp = '00:00:01',
      width = 640,
      height = 360,
    } = options;

    const args = [
      '-i', inputPath,
      '-ss', timestamp,
      '-vframes', '1',
      '-vf', `scale=${width}:${height}`,
      '-q:v', '2',
      outputPath,
    ];

    await this.executeCommand(this.ffmpegPath, args);
  }

  /**
   * Extract audio from video
   */
  static async extractAudio(
    inputPath: string,
    outputPath: string,
    format: 'mp3' | 'aac' | 'opus' = 'opus'
  ): Promise<void> {
    const codecMap = {
      mp3: 'libmp3lame',
      aac: 'aac',
      opus: 'libopus',
    };

    const args = [
      '-i', inputPath,
      '-vn',
      '-acodec', codecMap[format],
      '-ab', '192k',
      outputPath,
    ];

    await this.executeCommand(this.ffmpegPath, args);
  }

  /**
   * Get CPU usage setting for AV1 encoding based on preset
   */
  private static getAV1CpuUsed(preset: string): string {
    const presetMap: Record<string, string> = {
      ultrafast: '8',
      fast: '6',
      medium: '4',
      slow: '2',
      veryslow: '0',
    };
    return presetMap[preset] || '4';
  }

  /**
   * Get resolution dimensions from quality string
   */
  private static getResolution(quality: string): { width: number; height: number } | null {
    const resolutionMap: Record<string, { width: number; height: number }> = {
      '360p': { width: 640, height: 360 },
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '1440p': { width: 2560, height: 1440 },
      '4k': { width: 3840, height: 2160 },
    };
    return resolutionMap[quality] || null;
  }

  /**
   * Create multiple quality versions of a video
   */
  static async createMultipleQualities(
    inputPath: string,
    outputDir: string,
    qualities: string[],
    onProgress?: (quality: string, progress: number) => void
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const quality of qualities) {
      const outputPath = `${outputDir}/video_${quality}.mp4`;

      await this.transcode(
        {
          inputPath,
          outputPath,
          quality,
          codec: config.DEFAULT_VIDEO_CODEC as 'av1' | 'h264' | 'h265',
        },
        (progress) => onProgress?.(quality, progress)
      );

      results.set(quality, outputPath);
    }

    return results;
  }

  /**
   * Validate if a file is a valid video
   */
  static async isValidVideo(inputPath: string): Promise<boolean> {
    try {
      await this.getMetadata(inputPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get video duration in seconds
   */
  static async getDuration(inputPath: string): Promise<number> {
    const metadata = await this.getMetadata(inputPath);
    return metadata.duration;
  }
}
