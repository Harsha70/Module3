import express, { type Request, type Response } from 'express';
import { startWorker } from "./workers.ts"

const app = express();
app.use(express.json());

const queue: {userId: number, imagePath: string}[] = []

startWorker("WORKER_1", queue)
startWorker("WORKER_2", queue)

app.post('/enqueue', (req, res) => {
    const { userId, imagePath } = req.body;
    queue.push({ userId: parseInt(userId), imagePath });
    res.status(202).json({
        status: "Accepted",
        message: "Task added to queue",
        queueLength: queue.length
    });
});

app.listen(3002, () => {
    console.log("Server running on port 3002");
});