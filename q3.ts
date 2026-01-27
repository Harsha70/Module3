import express, { type Request, type Response } from 'express';
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

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

const thumbQueue: any[] = [];
const analyticsQueue: any[] = [];
const slackQueue: any[] = [];

const sleep = (seconds: number) => new Promise(res => setTimeout(res, seconds * 1000));

async function thumbnailWorker(){
    while(true){
        const task = thumbQueue.shift();
        if(task){
            console.log(`[Worker] Processing thumbnail for user ${task.userId}`);
            const inputPath = path.join(__dirname, task.imagePath);
            const thumbName = `thumb_${path.basename(task.imagePath)}`;
            const relativeThumbPath = `uploads/thumbs/${thumbName}`;
            const outputPath = path.join(__dirname, relativeThumbPath);

            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            await sharp(inputPath).resize(300, 300).toFile(outputPath);

            await prisma.user.update({
                where: { id: parseInt(task.userId) },
                data: { thumbnailImage: relativeThumbPath }
            });

            return relativeThumbPath;

        }
        await sleep(0.1);
    }
}

async function analyticsWorker(){
    while(true){
        const task = analyticsQueue.shift();
        if(task){
            await sleep(1);
            console.log(`[Worker] Processing analytics for user ${task.userId}`);
        }
        await sleep(0.1);
    }
}

async function slackWorker(){
    while(true){
        const task = slackQueue.shift();
        if(task){
            await sleep(2);
            console.log(`[Worker] Processing slack for user ${task.userId}`);
        }
        await sleep(0.1);
    }
}

thumbnailWorker();
analyticsWorker();
slackWorker();

app.post('/enqueue', (req, res) => {
    const {userId, imagePath} = req.body;
    const tast = {userId, imagePath};
    thumbQueue.push(tast);
    analyticsQueue.push(tast);
    slackQueue.push(tast);
    res.status(202).json({
        status: "Accepted",
        message: "Task added to queue",
        queueLength: thumbQueue.length
    });
})

app.listen(3003, () => {
    console.log("Server running on port 3003");
});
