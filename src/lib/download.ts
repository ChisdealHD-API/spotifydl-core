import os from 'os'
import { execSync } from 'child_process'

let ytdlPath

// Function to check if yt-dlp is installed
const checkYTDLPInstalled = () => {
    try {
        // Execute the command to check yt-dlp version
        const output = execSync('yt-dlp --version', { stdio: 'ignore' })
        return true
    } catch (error) {
        return false
    }
}

// Function to get the correct path based on the OS
const getYTDLPPath = () => {
    if (os.platform() === 'win32') {
        // Windows specific path
        return '../../yt-dlp.exe' // Adjust this if necessary
    } else if (os.platform() === 'darwin') {
        // macOS specific path
        return '/usr/local/bin/yt-dlp' // Adjust this if necessary
    } else if (os.platform() === 'linux') {
        // Linux specific path
        return '/usr/local/bin/yt-dlp' // Adjust this if necessary
    } else {
        throw new SpotifyDlError('Unsupported operating system', 'SpotifyDlError')
    }
}

// Initialize ytdlPath
try {
    if (checkYTDLPInstalled()) {
        ytdlPath = getYTDLPPath()
        console.log(`Using yt-dlp at: ${ytdlPath}`)
    } else {
        throw new SpotifyDlError('yt-dlp is not installed', 'SpotifyDlError')
    }
} catch (error) {
    if (error instanceof SpotifyDlError) {
        console.error(`SpotifyDlError: ${error.message}`)
    } else {
        console.error(`Unexpected Error`)
    }
}

// Create yt-dlp instance
import { create as createYoutubeDl } from 'yt-dlp-exec'
const ytdl = createYoutubeDl(ytdlPath)

import SpotifyDlError from './Error'
import { readFile, unlink, writeFile, move } from 'fs-extra'
import axios from 'axios'
import { Buffer } from 'buffer' // Ensure Buffer is imported
import NodeID3 from 'node-id3' // Import node-id3
import fs from 'fs'
const fetch = require('node-fetch') // Import node-fetch

async function downloadImage(url: string) {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error('Network response was not ok')
        }
        const buffer = await response.buffer() // Get the image as a buffer
        return buffer // Return the buffer to be used in ID3 tags
    } catch (error) {
        console.error('Error downloading image:', error)
        throw new Error('Failed to download image')
    }
}

async function saveImageAsPng(buffer: Buffer, filePath: string) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, buffer, (err) => {
            if (err) {
                console.error('Error saving image:', err)
                reject(err)
            } else {
                console.log('Image saved successfully at:', filePath)
                resolve(true)
            }
        })
    })
}

/**
 * Function to download the give `YTURL`
 * @param {string} url The youtube URL to download
 * @returns `Buffer`
 * @throws Error if the URL is invalid
 */
export const downloadYT = async (info: any, url: string, destinationDir: string): Promise<Buffer> => {
    const filename = `${Math.random().toString(36).slice(-5)}.mp3`

    const outputPath = `${destinationDir}/${info.artists.join(', ')} - ${info.name}.mp3`

    return new Promise<Buffer>(async (resolve, reject) => {
        // Get the stream from yt-dlp
        ytdl(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            username: 'oauth2',
            password: "''",
            audioQuality: 0,
            output: `${outputPath}`,
            referer: `${url}`
        }).then(async () => {
            // Extract relevant metadata
            // Define ID3 tags with cover image URL
            const newMetadata = {
                title: info.name || 'Unknown Title',
                artist: info.artists.join(', ') || 'Unknown Artist',
                album: info.album_name || 'Unknown Album', // Use album name from track details
            }
            // Write metadata using music-metadata
            await NodeID3.update(newMetadata, `${outputPath}`, (err: any) => {
                if (err) {
                    console.error('Error writing ID3 tags:', err)
                } else {
                    console.log('ID3 tags written successfully!')
                }
            })
        })
    })
}

/**
 * Function to move the downloaded file to a specified destination
 * @param {string} sourcePath Path of the file to move
 * @param {string} destinationPath Destination path for the file
 */
const moveFileToDestination = async (sourcePath: string, destinationPath: string): Promise<void> => {
    try {
        await move(sourcePath, destinationPath, { overwrite: true });
        console.log(`File moved to: ${destinationPath}`);
    } catch (err) {
        console.error('Error moving file:', err);
        throw new SpotifyDlError(`Error moving file to: ${destinationPath}`);
    }
};

/**
 * Function to download and save audio from youtube
 * @param url URL to download
 * @param filename the file to save to
 * @returns filename
 */
export const downloadYTAndSave = async (
    info: any,
    url: string,
    filename = (Math.random() + 1).toString(36).substring(7) + '.mp3',
    destinationDir: string,
): Promise<string> => {
    const outputPath = `${os.tmpdir()}/${filename}`;
    const destinationPath = `${destinationDir}/MusicDL`;
    const audio = await downloadYT(info, url, destinationPath)
    try {
        await writeFile(`${os.tmpdir()}/${filename}`, audio)
        // Move the file to the specified destination
        await moveFileToDestination(outputPath, destinationPath);
        return `${destinationDir}/${filename}`
    } catch (err) {
        throw new SpotifyDlError(`Error While writing to File: ${filename}`)
    }
}

/**
 * Function to get buffer of files with their URLs
 * @param url URL to get Buffer of
 * @returns Buffer
 */
export const getBufferFromUrl = async (url: string): Promise<Buffer> =>
    (await axios.get(url, { responseType: 'arraybuffer' })).data
