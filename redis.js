const redis = require('redis');
const { promisify } = require('util');
const client = redis.createClient();

// const hsetAsync = promisify(client.hset).bind(client);

client.on('error', (err) => {
    console.log('Redis error: ', err);
});

async function setTaskStatus(username, taskKey, status, outputFile = null) {
    const task = { status };
    if (outputFile) {
        task.outputFile = outputFile;
    }
    await hsetAsync(username, taskKey, task);
}

async function getTaskFromRedis(username, taskKey) {
    return new Promise((resolve, reject) => {
        client.hgetall(`${username}:${taskKey}`, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
}

module.exports = { setTaskStatus, getTaskFromRedis };
