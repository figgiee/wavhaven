import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { supabaseAdmin } from "@/lib/supabase/admin";

// --- File Processing Service ---

/**
 * Sanitizes a filename by removing special characters and spaces
 */
export function sanitizeFilename(filename: string): string {
	if (!filename) return '';
	const noSpaces = filename.replace(/\s+/g, '_');
	const normalized = noSpaces.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	const sanitized = normalized.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
	return sanitized.slice(0, 200);
}

/**
 * Generates storage paths for track files
 */
export function generateTrackStoragePaths(
	producerId: string,
	trackId: string,
	previewFileName: string,
	coverFileName: string
): {
	previewStoragePath: string;
	coverStoragePath: string;
} {
	const sanitizedPreviewFilename = sanitizeFilename(previewFileName);
	const sanitizedCoverFilename = sanitizeFilename(coverFileName);
	
	return {
		previewStoragePath: `users/${producerId}/tracks/${trackId}/${sanitizedPreviewFilename}`,
		coverStoragePath: `users/${producerId}/tracks/${trackId}/${sanitizedCoverFilename}`,
	};
}

/**
 * Creates signed upload URLs for multiple files
 */
export async function createSignedUploadUrls(
	bucketName: string,
	paths: string[],
	expiresIn: number = 300
): Promise<{
	urls: string[];
	error?: string;
}> {
	try {
		const urlPromises = paths.map(path => 
			supabaseAdmin.storage
				.from(bucketName)
				.createSignedUploadUrl(path, { expiresIn })
		);
		
		const results = await Promise.all(urlPromises);
		
		// Check for any errors
		for (const [index, result] of results.entries()) {
			if (result.error || !result.data?.signedUrl) {
				return {
					urls: [],
					error: `Failed to create signed URL for path ${paths[index]}: ${result.error?.message}`
				};
			}
		}
		
		return {
			urls: results.map(result => result.data!.signedUrl)
		};
	} catch (error) {
		return {
			urls: [],
			error: error instanceof Error ? error.message : 'Unknown error creating signed URLs'
		};
	}
}

/**
 * Gets public URLs for storage paths
 */
export function getPublicUrl(storagePath: string, bucketName: string = 'wavhaven-tracks'): string | null {
	try {
		const { data } = supabaseAdmin.storage
			.from(bucketName)
			.getPublicUrl(storagePath);
		return data.publicUrl;
	} catch (error) {
		console.error('Error getting public URL:', error);
		return null;
	}
}

// --- Audio Processing Service ---

/**
 * Interface for watermarking configuration
 */
interface WatermarkConfig {
	originalFilePath: string;
	watermarkFilePath: string;
	outputFilePath: string;
	watermarkVolume?: number; // Default 0.17
	originalVolume?: number; // Default 1.0
}

/**
 * Applies watermark to audio file using FFmpeg
 */
export async function applyWatermark(config: WatermarkConfig): Promise<void> {
	const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
	const ffmpeg = (await import("fluent-ffmpeg")).default;
	ffmpeg.setFfmpegPath(ffmpegInstaller.path);

	return new Promise<void>((resolve, reject) => {
		const watermarkVol = config.watermarkVolume ?? 0.17;
		const originalVol = config.originalVolume ?? 1.0;

		console.log(`[WatermarkService] Processing: ${config.originalFilePath} -> ${config.outputFilePath}`);
		
		ffmpeg()
			.input(config.originalFilePath)
			.input(config.watermarkFilePath)
			.complexFilter([
				`[0:a]volume=${originalVol}[a0]; [1:a]volume=${watermarkVol}[a1]; [a0][a1]amix=inputs=2:duration=longest[aout]`,
			])
			.map("[aout]")
			.audioCodec("libmp3lame")
			.audioBitrate("128k")
			.outputOptions("-preset fast")
			.on("start", (commandLine) =>
				console.log("[WatermarkService] Spawned Ffmpeg with command: " + commandLine),
			)
			.on("error", (err, stdout, stderr) => {
				console.error("[WatermarkService] ffmpeg Error:", err.message);
				console.error("[WatermarkService] ffmpeg stdout:", stdout);
				console.error("[WatermarkService] ffmpeg stderr:", stderr);
				reject(new Error(`ffmpeg processing failed: ${err.message}`));
			})
			.on("end", () => {
				console.log("[WatermarkService] ffmpeg processing finished successfully.");
				resolve();
			})
			.save(config.outputFilePath);
	});
}

/**
 * Creates a watermarked preview file from the original track
 */
export async function createWatermarkedPreview(
	originalFile: File,
	watermarkFilePath: string
): Promise<{
	watermarkedFile: File | null;
	tempPaths: string[];
	error?: string;
}> {
	const tempPaths: string[] = [];
	
	try {
		// Check if watermark file exists
		try {
			await fs.access(watermarkFilePath);
		} catch {
			return {
				watermarkedFile: null,
				tempPaths,
				error: `Watermark file not found at ${watermarkFilePath}`
			};
		}

		// Create temporary directory
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wavhaven-watermark-"));
		const originalTempPath = path.join(tempDir, `original_${sanitizeFilename(originalFile.name)}`);
		const watermarkedTempPath = path.join(tempDir, `watermarked_preview.mp3`);
		
		tempPaths.push(originalTempPath, watermarkedTempPath, tempDir);

		// Write original file to temporary location
		const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
		await fs.writeFile(originalTempPath, originalBuffer);

		// Apply watermark
		await applyWatermark({
			originalFilePath: originalTempPath,
			watermarkFilePath,
			outputFilePath: watermarkedTempPath,
		});

		// Read watermarked file and create File object
		const watermarkedBuffer = await fs.readFile(watermarkedTempPath);
		const watermarkedFile = new File(
			[watermarkedBuffer],
			'watermarked_preview.mp3',
			{ type: "audio/mpeg" }
		);

		return {
			watermarkedFile,
			tempPaths
		};

	} catch (error) {
		return {
			watermarkedFile: null,
			tempPaths,
			error: error instanceof Error ? error.message : 'Unknown watermarking error'
		};
	}
}

/**
 * Cleans up temporary files created during processing
 */
export async function cleanupTempFiles(tempPaths: string[]): Promise<void> {
	for (const tempPath of tempPaths) {
		try {
			const stat = await fs.stat(tempPath);
			if (stat.isDirectory()) {
				await fs.rmdir(tempPath, { recursive: true });
			} else {
				await fs.unlink(tempPath);
			}
		} catch (error) {
			console.error(`[TrackService] Failed to cleanup ${tempPath}:`, error);
		}
	}
}

// --- File Type Detection ---

/**
 * Determines track file type from MIME type or file extension
 */
export function determineTrackFileType(file: File): 'MAIN_MP3' | 'MAIN_WAV' | 'MAIN_AIFF' | 'MAIN_FLAC' {
	const mimeType = file.type.toLowerCase();
	const extension = file.name.split('.').pop()?.toLowerCase();

	if (mimeType === 'audio/wav' || extension === 'wav') {
		return 'MAIN_WAV';
	} else if (mimeType === 'audio/aiff' || extension === 'aiff' || extension === 'aif') {
		return 'MAIN_AIFF';
	} else if (mimeType === 'audio/flac' || extension === 'flac') {
		return 'MAIN_FLAC';
	} else {
		// Default to MP3 for audio/mpeg and unknown types
		return 'MAIN_MP3';
	}
}

/**
 * Determines image file type from MIME type or file extension
 */
export function determineImageFileType(file: File): 'IMAGE_PNG' | 'IMAGE_JPEG' | 'IMAGE_WEBP' {
	const mimeType = file.type.toLowerCase();
	const extension = file.name.split('.').pop()?.toLowerCase();

	if (mimeType === 'image/png' || extension === 'png') {
		return 'IMAGE_PNG';
	} else if (mimeType === 'image/webp' || extension === 'webp') {
		return 'IMAGE_WEBP';
	} else {
		// Default to JPEG for image/jpeg and unknown types
		return 'IMAGE_JPEG';
	}
} 