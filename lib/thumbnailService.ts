import { app } from 'electron';
import path from 'path';
import fs from 'fs-extra'; // Use fs-extra for ensureDirSync
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from 'ffprobe-static';
import os from 'os'; // Import the os module

// Set ffmpeg/ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const THUMBNAIL_WIDTH = 200; // Example width
const THUMBNAIL_HEIGHT = 200; // Example height
// Use userData path + /cache/thumbnails subdirectory
const USER_DATA_PATH = app.getPath('userData');
const CACHE_DIR = path.join(USER_DATA_PATH, 'cache', 'thumbnails');

// Ensure the cache directory exists
fs.ensureDirSync(CACHE_DIR);

export class ThumbnailService {
  private getThumbnailPath(assetId: number): string {
    return path.join(CACHE_DIR, `${assetId}.jpg`);
  }

  async generateImageThumbnail(
    sourcePath: string,
    assetId: number
  ): Promise<string> {
    const finalOutputPath = this.getThumbnailPath(assetId);
    // Create a unique temporary file path
    const tempFileName = `${assetId}-${Date.now()}.tmp.jpg`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      // 1. Write to temporary file first
      await sharp(sourcePath)
        .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
          fit: 'cover',
          position: 'centre',
        })
        .jpeg({ quality: 80 })
        .toFile(tempFilePath);
        
      console.log(`Generated temporary thumbnail for ${assetId} at ${tempFilePath}`);

      // 2. Move temporary file to final destination (overwrite if exists)
      await fs.move(tempFilePath, finalOutputPath, { overwrite: true });

      console.log(`Moved thumbnail for ${assetId} to ${finalOutputPath}`);
      return finalOutputPath;

    } catch (error) {
      console.error(
        `Error generating image thumbnail for ${assetId} from ${sourcePath}:`,
        error
      );
      // Clean up temporary file if move failed or sharp failed
      await fs.remove(tempFilePath).catch(err => console.error(`Failed to remove temp thumb file ${tempFilePath}:`, err));
      throw new Error('Image thumbnail generation failed');
    }
  }

  async generateVideoThumbnail(
    sourcePath: string,
    assetId: number
  ): Promise<string> {
    const outputPath = this.getThumbnailPath(assetId);

    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .on('end', () => {
          console.log(`Generated video thumbnail for ${assetId} at ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(
            `Error generating video thumbnail for ${assetId} from ${sourcePath}:`,
            err
          );
          reject(new Error('Video thumbnail generation failed'));
        })
        .screenshots({
          count: 1,
          folder: CACHE_DIR,
          filename: `${assetId}.jpg`,
          size: `${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`,
          timemarks: ['1'],
        });
    });
  }

  // Generic generate method
  async generateThumbnail(
    sourcePath: string,
    mimeType: string,
    assetId: number
  ): Promise<string | null> {
    try {
      if (mimeType.startsWith('image/')) {
        return await this.generateImageThumbnail(sourcePath, assetId);
      } else if (mimeType.startsWith('video/')) {
        return await this.generateVideoThumbnail(sourcePath, assetId);
      } else {
        console.warn(`Unsupported mime type for thumbnail generation: ${mimeType}`);
        // TODO: Handle other types like PDF or return a default placeholder
        return null;
      }
    } catch (error) {
      console.error(`Thumbnail generation failed overall for asset ${assetId}:`, error);
      return null; 
    }
  }

  getThumbnailFilePath(assetId: number): string {
    return this.getThumbnailPath(assetId);
  }

  async ensureThumbnailExists(assetId: number): Promise<boolean> {
    const thumbPath = this.getThumbnailPath(assetId);
    return fs.pathExists(thumbPath);
  }
}

// Export a singleton instance
export const thumbnailService = new ThumbnailService(); 