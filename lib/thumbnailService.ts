import path from 'node:path';
import fs from 'fs-extra'; // Use fs-extra for ensureDirSync
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from 'ffprobe-static';
import os from 'os'; // Import the os module
import { exec } from 'child_process'; // Import exec
import util from 'node:util'; // Import util for promisify

// Set ffmpeg/ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const THUMBNAIL_SIZE = 256; // Example size

// Promisify exec for async/await usage
const execPromise = util.promisify(exec);

// Remove top-level path calculation and check
// const PROJECT_ROOT = process.env.APP_ROOT; 
// if (!PROJECT_ROOT) { ... }
// const THUMBNAIL_DIR = path.join(PROJECT_ROOT, 'cache', 'thumbnail');
// fs.ensureDirSync(THUMBNAIL_DIR);

class ThumbnailService {
  private thumbnailDir: string | null = null;
  private projectRoot: string | null = null;

  // Initialization method to set paths
  initialize(projectRoot: string): void {
    if (!projectRoot) {
      const errorMsg = "FATAL: Project root path provided to ThumbnailService initialize is invalid.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    this.projectRoot = projectRoot;
    this.thumbnailDir = path.join(this.projectRoot, 'cache', 'thumbnails');
    console.log(`ThumbnailService initialized. Thumbnail directory: ${this.thumbnailDir}`);
    // Ensure the directory exists upon initialization
    try {
      fs.ensureDirSync(this.thumbnailDir);
    } catch (error) {
        const errorMsg = `FATAL: Failed to ensure thumbnail directory exists at ${this.thumbnailDir}`;
        console.error(errorMsg, error);
        throw new Error(errorMsg);
    }
  }

  // Helper to get path, ensuring initialization occurred
  private getThumbnailPath(assetId: number): string {
    if (!this.thumbnailDir) {
        throw new Error('ThumbnailService not initialized. Call initialize() first.');
    }
    return path.join(this.thumbnailDir, `${assetId}.jpg`);
  }

  // --- Methods using getThumbnailPath --- 

  // Method using temp file workaround
  private async generateImageThumbnail(
    sourcePath: string,
    assetId: number
  ): Promise<string> {
    const finalTargetPath = this.getThumbnailPath(assetId); // Uses the initialized path
    const tempFileName = `${assetId}-${Date.now()}.tmp.jpg`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    console.log(`Generating image thumbnail (via temp): ${sourcePath} -> ${tempFilePath} -> ${finalTargetPath}`);

    try {
      await sharp(sourcePath)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(tempFilePath);
      console.log(`Generated temporary thumbnail for ${assetId} at ${tempFilePath}`);
      await fs.move(tempFilePath, finalTargetPath, { overwrite: true });
      console.log(`Moved thumbnail for ${assetId} to ${finalTargetPath}`);
      return finalTargetPath;
    } catch (error) {
      console.error(`Sharp/Move error generating thumbnail for ${assetId}:`, error);
      await fs.remove(tempFilePath).catch(err => console.error(`Failed to remove temp thumb file ${tempFilePath}:`, err));
      throw error;
    }
  }

  // Video thumbnail generation
  private async generateVideoThumbnail(
    sourcePath: string,
    assetId: number
  ): Promise<string> {
    const targetPath = this.getThumbnailPath(assetId);
    const thumbnailDir = this.thumbnailDir; // Get dir for ffmpeg folder option
    if (!thumbnailDir) { throw new Error('ThumbnailService not initialized.'); }

    console.log(`Generating video thumbnail: ${sourcePath} -> ${targetPath}`);
    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .on('end', () => {
          console.log(`Generated video thumbnail for ${assetId} at ${targetPath}`);
          resolve(targetPath);
        })
        .on('error', (err) => {
          console.error(`Error generating video thumbnail for ${assetId} from ${sourcePath}:`, err);
          reject(new Error('Video thumbnail generation failed'));
        })
        .screenshots({
          count: 1,
          folder: thumbnailDir, // This already uses the property, which is now correct
          filename: `${assetId}.jpg`,
          size: `${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}`,
          timemarks: ['1'],
        });
    });
  }

  // PDF thumbnail generation using ImageMagick (if available)
  private async generatePdfThumbnail(
     sourcePath: string,
     assetId: number
   ): Promise<string | null> { // Return null on failure
     const targetPath = this.getThumbnailPath(assetId);
     console.log(`Attempting PDF thumbnail generation for asset ${assetId}...`);
     
     // Command to extract the first page of the PDF and save as JPG thumbnail
     // Requires ImageMagick and Ghostscript (as delegate) to be installed and in PATH
     // Using -resize instead of -thumbnail for broader compatibility
     // -resize ${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}> : Resize, preserving aspect ratio, only shrink if larger
     // -background white -alpha remove -alpha off : Handle transparency
     // Using `magick` instead of `convert` to avoid Windows PATH conflicts
     const resizeArg = `${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}>`;
     const command = `magick "${sourcePath}[0]" -resize "${resizeArg}" -background white -alpha remove -alpha off "${targetPath}"`;

     try {
         console.log(`Executing ImageMagick command: ${command}`);
         // Pass the current environment to the child process, ensuring PATH is inherited
         const execOptions = { env: { ...process.env } }; 
         const { stdout, stderr } = await execPromise(command, execOptions);
         if (stderr) {
             console.warn(`ImageMagick stderr for asset ${assetId}:`, stderr);
         }
         // Check if the target file was actually created
         if (await fs.pathExists(targetPath)) {
             console.log(`PDF thumbnail generated successfully via ImageMagick for asset ${assetId}.`);
             return targetPath;
         } else {
             console.error(`ImageMagick command finished for asset ${assetId}, but output file not found at ${targetPath}. Stdout: ${stdout}`);
             return null;
         }
     } catch (error: unknown) {
         // Type check before accessing properties
         const message = error instanceof Error ? error.message : String(error);
         console.error(`Error generating PDF thumbnail for asset ${assetId} using ImageMagick:`, message);
         if (message.includes('command not found') || message.includes('not recognized')) {
            console.error("--> ImageMagick 'convert' command not found. Ensure ImageMagick (with Ghostscript delegate) is installed and in your system PATH.");
         }
         return null; // Return null on error
     }
   }

  // Main generation function
  async generateThumbnail(
    sourcePath: string,
    mimeType: string,
    assetId: number
  ): Promise<string | null> {
    if (!this.thumbnailDir || !this.projectRoot) { // Check initialization
      console.error('ThumbnailService not initialized before generateThumbnail call.');
      return null;
    }
    console.log(`Generating thumbnail for ${assetId} (${mimeType}) from ${sourcePath}`);
    try {
      let generatedPath: string | null = null;
      if (mimeType.startsWith('image/')) {
        generatedPath = await this.generateImageThumbnail(sourcePath, assetId);
      } else if (mimeType.startsWith('video/')) {
        generatedPath = await this.generateVideoThumbnail(sourcePath, assetId);
      } else if (mimeType === 'application/pdf') {
        generatedPath = await this.generatePdfThumbnail(sourcePath, assetId);
      }

      if (generatedPath && await fs.pathExists(generatedPath)) {
        console.log(`Thumbnail generated successfully for ${assetId} at ${generatedPath}`);
        return generatedPath; 
      } else {
        // Log specific reason if generatePdfThumbnail returned null explicitly
        if (mimeType === 'application/pdf' && generatedPath === null) {
            console.warn(`PDF thumbnail generation failed or tool not available for asset ${assetId}.`);
        } else {
            console.warn(`Thumbnail generation skipped or failed for asset ${assetId}. Path: ${generatedPath}`);
        }
        return null;
      }
    } catch (error) {
      console.error(`Error generating thumbnail for asset ${assetId}:`, error);
      return null;
    }
  }

  // Helper methods (remain the same, rely on getThumbnailPath)
  getThumbnailFilePath(assetId: number): string {
    return this.getThumbnailPath(assetId);
  }

  async ensureThumbnailExists(assetId: number): Promise<boolean> {
    const thumbPath = this.getThumbnailPath(assetId);
    return fs.pathExists(thumbPath);
  }
}

// Export a singleton instance, to be initialized later
export const thumbnailService = new ThumbnailService();
