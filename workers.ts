import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
});

const prisma = new PrismaClient({ adapter });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (seconds: number) => new Promise(res => setTimeout(res, seconds * 1000));

async function generate_thumbnail(userId: number, imagePath: string): Promise<string> {
    const inputPath = path.join(__dirname, imagePath);
    const thumbName = `thumb_${path.basename(imagePath)}`;
    const thumbUrl = `uploads/thumbs/${thumbName}`;
    const outputPath = path.join(__dirname, thumbUrl);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // await new Promise(res => setTimeout(res, 2000));

    await sharp(inputPath).resize(300, 300).toFile(outputPath);

    await prisma.user.update({
        where: { id: userId },
        data: { thumbnailImage: thumbUrl }
    });

    console.log(`User ${userId} thumbnail generated successfully.`);
    return thumbUrl;
}

async function log_upload(userId: number){
    await sleep(1);
    console.log(`[Analytics] logged upload event for user ${userId}`)
}

async function notify_admin(userId: number){
    await sleep(2);
    console.log(`[Slack] notified admin about user ${userId}`)
}

export async function startWorker(workerName: string, queue: any[]){
    console.log(`[${workerName}] Active and listening`)
    while(true){
        const task = queue.shift();
        if(task){
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] ${workerName} picked up User ${task.userId}`);
            try{
                await generate_thumbnail(task.userId, task.imagePath);
                await log_upload(task.userId);
                await notify_admin(task.userId);
                console.log(`[${workerName}] Completed User ${task.userId}`);
            }catch(err: any){
                console.error(`[${workerName}] Error:`, err.message);
            }
        }else{
            await sleep(0.5);
        }
    }
}



