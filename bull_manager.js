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
    // await setTaskStatus(username, taskKey, 'waiting');
    console.log("[bull_manager] setTaskStatus passed");
    taskQueue.add({ username, file, taskKey });
    console.log("[bull_manager] add to taskQueue passed");
}

module.exports = { addTaskToQueue };
