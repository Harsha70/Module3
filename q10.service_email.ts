import { createClient } from "redis";
import "dotenv/config";

const subscriber = createClient({
    username: process.env.REDIS_USERNAME || '',
    password: process.env.REDIS_PASSWORD || '',
    socket: {
        host: process.env.REDIS_HOST || '',
        port: Number(process.env.REDIS_PORT || '')
    }
})

async function run() {
    await subscriber.connect();
    console.log("Email Service Listening...")

    subscriber.subscribe("order_placed", (message) => {
        const data = JSON.parse(message);
        console.log(`[Worker_2][Email] Sending email to ${data.email}...`);
    });
}

run();