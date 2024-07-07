// management of task queue
// should implement a minimal function set of:
// 1. add a task to queue
// 2. process the next task in queue front
// 3. remove task from queue

const Queue = require('bull');
// const { setTaskStatusToRedis, getTaskStatusFromRedis } = require('./redis');
let mRedis = require('./redis');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { stderr, stdout } = require('process');

const TAG = "[bull_manager]";

const taskQueue = new Queue('tasks', 'redis://127.0.0.1:6379');

const processTask = (async (job, done) => {
    const { username, file, taskKey } = job.data;
    const status = await mRedis.getTaskStatusFromRedis(username, taskKey);
    try {
        console.log(TAG, "check task status before start process:", username, taskKey, status);
        await mRedis.setTaskStatusToRedis(username, taskKey, 'processing');
        // console.log("updating task status to processing:", username, taskKey)

        // Process the file (e.g., move it to an output directory)
        // const outputFilePath = path.join(__dirname, 'public/outputs', file.filename);
        // fs.renameSync(file.path, outputFilePath);
        let cmd = 'bash process_task.sh';
        console.log(TAG, "start processing...");
        // exec(cmd, {windowsHide: true}, (error, stdout, stderr) => {
        //     if (error){
        //         console.error(TAG, "error: ", error.message);
        //         done();
        //         return;
        //     }
        //     if (stderr){
        //         console.error(TAG, "stderr: ", stderr);
        //         done();
        //         return;
        //     }
        //     console.log(TAG, "stdout: ", stdout);
        //     done();
        // })

        await mRedis.setTaskStatusToRedis(username, taskKey, 'Done', outputFilePath);
    } catch (error) {
        // await mRedis.setTaskStatusToRedis(username, taskKey, 'Failed');
    }
});

async function addTaskToQueue(username, file, taskKey) {
    // await setTaskStatus(username, taskKey, 'waiting');
    // console.log(TAG, "setTaskStatus finished");
    taskQueue.add({ username, file, taskKey });
    console.log(TAG, "add to taskQueue finished");
}

taskQueue.process(processTask);

module.exports = { addTaskToQueue };
