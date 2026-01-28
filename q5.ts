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

interface GlobalEvent {
    event: string;
    data: any;
}

const eventQueue: GlobalEvent[] = [];

const actions = {
    generate_thumbnail: async (data: any) => {await new Promise(res => setTimeout(res, 1000));console.log(`[Sharp] Resizing ${data.imagePath}...`)},
    log_upload: async (data: any) => console.log(`[Analytics] Logging user ${data.userId}...`),
    notify_admin: async (data: any) => console.log(`[Slack] Notifying admin...`)
};

async function startWorker(id: string) {
    while (true) {
        const task = eventQueue.shift();
        if (task) {
            console.log(`[${id}] Dispatching event: ${task.event}`);

            if (task.event === "image_uploaded") {
                await actions.generate_thumbnail(task.data);
                await actions.log_upload(task.data);
                await actions.notify_admin(task.data);
            }

            if (task.event === "user_deleted") {
                console.log("[CleanUp] removing user files from disk...")
            }
        } else {
            await new Promise(res => setTimeout(res, 100));
        }
    }
}

startWorker("WORKER_1");
startWorker("WORKER_2");

app.post('/enqueue', (req: Request, res: Response) => {
    const { userId, imagePath } = req.body;
    eventQueue.push({ event: "image_uploaded", data: { userId, imagePath } });
    res.status(202).json({
        status: "Accepted",
        message: "Task added to queue",
        queueLength: eventQueue.length
    });
})

app.listen(3004, () => {
    console.log("Server running on port 3004");
});
