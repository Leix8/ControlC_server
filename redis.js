const redis = require('redis');
// const { promisify } = require('util');
const client = redis.createClient();

client.on('error', (err) => {
    console.log('Redis error: ', err);
});

async function addNewTaskToRedis(username, taskKey){
    await client.connect(6379, "127.0.0.1").then(async (res) => {
        console.log(username, taskKey, "connected");
        await client.lPush(username, taskKey);
        console.log("Lpush new task done");
        // let info = {
        //     status : "in queue",
        //     taskKey: taskKey
        // }
        // await client.set(taskKey, info);
        // console.log("set task key-val done");
        await client.disconnect();
        setTaskStatusToRedis(username, taskKey, "in queue");
    }).catch((err) => console.log("error happened in adding new task to redis [redis.js::addNewTaskToRedis]"))
}

async function setTaskStatusToRedis(username, taskKey, status, outputFile = null) {
    await client.connect(6379, "127.0.0.1").then(async (res) => {
        console.log(username, taskKey, "connected");
        let info = {
            taskKey: taskKey,
            status: status
        }
        await client.set(taskKey, JSON.stringify(info));
        console.log("set task key-val done");
        await client.disconnect();
    }).catch((err) => console.log("error happened in setting task status to redis [redis.js::setTaskStatusToRedis]"))
}

async function getTaskStatusFromRedis(username, taskKey) {
    return new Promise((resolve, reject) => {
        client.connect(6379, "127.0.0.1").then( async (res) => {
            console.log(username, taskKey, "connected");
            let result = await client.get(taskKey);
            console.log("retrieved info:", result);
            resolve(JSON.parse(result));
            await client.disconnect();
        }).catch((err) => {
            console.log("error happened when querying task status [redis.js::getTaskStatusFromRedis]");
            resolve("getTaskStatusFromRedis failed");
        })
    });
}

module.exports = { setTaskStatusToRedis, getTaskStatusFromRedis, addNewTaskToRedis };
