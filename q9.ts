import express, {type Request, type Response} from "express";
import { createClient } from "redis";
import "dotenv/config";

const app = express();
app.use(express.json());

const publisher = createClient({
    username: process.env.REDIS_USERNAME || '',
    password: process.env.REDIS_PASSWORD || '',
    socket: {
        host: process.env.REDIS_HOST || '',
        port: Number(process.env.REDIS_PORT || '')
    }
})
const subscriber = createClient({
    username: process.env.REDIS_USERNAME || '',
    password: process.env.REDIS_PASSWORD || '',
    socket: {
        host: process.env.REDIS_HOST || '',
        port: Number(process.env.REDIS_PORT || '')
    }
})


async function initRedis() {
    try {
        await publisher.connect();
        await subscriber.connect();
        console.log("Connected to Redis Pub/Sub");
        
        setupWorkers();
    } catch (err) {
        console.error("Redis Connection Error:", err);
    }
}

function setupWorkers() {
    subscriber.subscribe("image_uploaded", async (message) => {
        const data = JSON.parse(message);
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [Worker_1][Sharp] Resizing ${data.imagePath}...`);
        await new Promise(res => setTimeout(res, 10000)); 
        console.log(`[${timestamp}] [Worker_1] Done Resizing.`);
    });

    subscriber.subscribe("image_uploaded", (message) => {
        const data = JSON.parse(message);
        console.log(`[Worker_2][Analytics] Logging user ${data.userId}...`);
    });

    subscriber.subscribe("image_uploaded", (message) => {
        console.log(`[Worker_3][Slack] Notifying admin...`);
    });
}

app.post("/enqueue", async (req: Request, res: Response) => {
    const { userId, imagePath } = req.body;

    if (!userId || !imagePath) {
        return res.status(400).json({ error: "Missing userId or imagePath" });
    }

    const payload = JSON.stringify({ userId, imagePath });

    // Publish to Redis instead of local class
    await publisher.publish("image_uploaded", payload);

    res.status(202).json({
        status: "Accepted",
        message: "Event broadcasted via Redis",
    });
});

app.listen(3008, () => {
    console.log("🚀 Server running on port 3008");
    initRedis();
});

