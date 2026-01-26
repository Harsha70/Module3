import express, { type Request, type Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
});

const prisma = new PrismaClient({ adapter });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(__dirname);

const app = express();
app.use(express.json());

interface ImageTask {
    userId: number;
    imagePath: string;
}

const queue: ImageTask[] = [];

async function startWorker(workerName: string) {
    console.log(`[${workerName}] Standing by...`);

    while (true) {
        const task = queue.shift();

        if (task) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] ${workerName} picked up User ${task.userId}`);

            try {
                const inputPath = path.join(__dirname, task.imagePath);
                const thumbName = `thumb_${path.basename(task.imagePath)}`;
                const thumbUrl = `uploads/${thumbName}`;
                const outputPath = path.join(__dirname, thumbUrl);

                await new Promise(res => setTimeout(res, 2000));

                await sharp(inputPath).resize(300, 300).toFile(outputPath);

                await prisma.user.update({
                    where: { id: task.userId },
                    data: { thumbnailImage: thumbUrl }
                });

                console.log(`[${workerName}] ✅ Completed User ${task.userId}`);
            } catch (err: any) {
                console.error(`[${workerName}] ❌ Error:`, err.message);
            }
        } else {
            await new Promise(res => setTimeout(res, 500));
        }
    }
}

startWorker("WORKER_1");
startWorker("WORKER_2");

app.post('/enqueue', (req: Request, res: Response) => {
    const { userId, imagePath } = req.body;

    queue.push({ userId: Number(userId), imagePath });

    res.status(202).json({
        status: "Accepted",
        message: "Task added to queue",
        queueLength: queue.length
    });
});

app.listen(3001, () => {
    console.log("Server running on port 3001");
});