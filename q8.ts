import express, { type Request, type Response } from 'express';

const app = express();
app.use(express.json());

type SubscriberFn = (data: any) => Promise<void> | void;

class PubSub {
    private subscribers: Record<string, SubscriberFn[]> = {};
    public subscribersCount: number = 0;

    public subscribe(event: string, fn: SubscriberFn) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(fn);
        console.log(`[${event}] Subscribed to event`);
        this.subscribersCount++;
    }

    public async publish(event: string, data: any) {
        const handlers = this.subscribers[event] || [];

        if (!handlers.length) {
            console.log(`[${event}] No subscribers found`);
            return;
        }

        console.log(`[${event}] Found ${handlers.length} subscribers`);
        for (const handler of handlers) {
            try {
                await handler(data);
            } catch (err: any) {
                console.error(`[${event}] Error:`, err.message);
            }
        }
    }
}

const ps = new PubSub();
ps.subscribe("image_uploaded", async (data: any) => {
    console.log(`[Worker_1][Sharp] Resizing ${data.imagePath}...`);
    await new Promise(res => setTimeout(res, 10000));
});

ps.subscribe("image_uploaded", async (data: any) => {
    console.log(`[Worker_2][Analytics] Logging user ${data.userId}...`);
});

ps.subscribe("image_uploaded", async (data: any) => {
    console.log(`[Worker_3][Slack] Notifying admin...`);
});


app.post("/enqueue", (req: Request, res: Response) => {
    const { userId, imagePath } = req.body;
    ps.publish("image_uploaded", { userId, imagePath });
    res.status(202).json({
        status: "Accepted",
        message: "Task added to queue",
        queueLength: ps.subscribersCount
    });
});

app.listen(3008, () => {
    console.log("Server running on port 3008");
});