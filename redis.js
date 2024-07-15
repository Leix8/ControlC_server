const redis = require('redis');
// const Redis = require('ioredis');
const { promisify } = require('util');
const prettyjson = require('prettyjson');
const client = redis.createClient({ host: '127.0.0.1', port: 6379 });
client.connect().catch(console.error);
client.clientId = `client-${Math.random().toString(36).substr(2, 9)}`;

const TAG = "[redis]";

client.on('error', (err) => {
    console.error(TAG, 'Redis error: ', err);
});

function checkClient() {
    if (!client || client.ready === false) {
        throw new Error('Redis client is not initialized or not connected');
    }
    else{
        console.log(TAG, `checkClient success, client.clientID = ${client.clientId}`);
    }
}

async function addNewTaskToRedis(username, taskKey){
    checkClient();
    try{
        console.log(TAG, `addNewTaskToRedis connected: ${username}: ${taskKey}`);
        await client.lPush(username, taskKey);
        console.log(TAG, "Lpush new task done");
        return await setTaskStatusToRedis(username, taskKey, "in queue", '/resources/dummy_html.html');
    } catch(err){
        console.error(TAG, "error happened in adding new task to redis [redis.js::addNewTaskToRedis]");
        console.error(TAG, err);
    }
}

async function setTaskStatusToRedis(username, taskKey, status, outputFile = null) {
    checkClient();
    try{
        console.log(TAG, `setTaskStatusToRedis connected: ${username}: ${taskKey} = ${status}, ${outputFile}`);
        let info = {
            taskKey: taskKey,
            status: status,
            outputFile: outputFile
        }
        await client.set(taskKey, JSON.stringify(info));
        console.log(TAG, "updating task status to redis done");
        return await getTaskStatusFromRedis(username, taskKey);

    }catch (err){
        console.error(TAG, "error happened in setting task status to redis [redis.js::setTaskStatusToRedis]");
        console.error(TAG, err);
    }
}

async function getTaskStatusFromRedis(username, taskKey){
    checkClient();
    try{
        console.log(TAG, `getTaskStatusFromRedis connected: ${username}: ${taskKey}`);
        return new Promise(async (resolve) => {
            let result = await client.get(taskKey);
            console.log(TAG, prettyjson.render(result));
            resolve(JSON.parse(result));
        })
    } catch (err){
        console.error(TAG, "error happened when querying task status [redis.js::getTaskStatusFromRedis]");
        console.error(TAG, err);
    }
}

module.exports = { setTaskStatusToRedis, getTaskStatusFromRedis, addNewTaskToRedis };
