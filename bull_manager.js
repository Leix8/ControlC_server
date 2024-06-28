const Queue = require('bull');
const { setTaskStatus } = require('./redis');
const path = require('path');
const fs = require('fs');

const taskQueue = new Queue('tasks', 'redis://127.0.0.1:6379');

taskQueue.process(async (job) => {
    const { username, file, taskKey } = job.data;
    try {
        await setTaskStatus(username, taskKey, 'processing');
        // Process the file (e.g., move it to an output directory)
        const outputFilePath = path.join(__dirname, 'public/outputs', file.filename);
        fs.renameSync(file.path, outputFilePath);
        await setTaskStatus(username, taskKey, 'Done', outputFilePath);
    } catch (error) {
        await setTaskStatus(username, taskKey, 'Failed');
    }
});

async function addTaskToQueue(username, file, taskKey) {
    await setTaskStatus(username, taskKey, 'waiting');
    taskQueue.add({ username, file, taskKey });
}

async function getTaskStatus(username, taskKey) {
    return await getTaskFromRedis(username, taskKey);
}

module.exports = { addTaskToQueue, getTaskStatus };
