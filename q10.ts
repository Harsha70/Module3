import express, { type Request, type Response } from 'express';
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

async function startApi() {
    await publisher.connect();

    app.post("/order", async (req: Request, res: Response) => {
        const orderData = {orderId: req.body.id, email: req.body.email};

        await publisher.publish("order_placed", JSON.stringify(orderData));

        res.status(200).json({message: "Order received and event broadcasted!"})
        
    });

    app.listen(3010, () => {
        console.log("🚀 Server running on port 3010");
    })
}

startApi();

