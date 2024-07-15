// management of task queue
// should implement a minimal function set of:
// 1. add a task to queue
// 2. process the next task in queue front
// 3. remove task from queue

const Queue = require('bull');
let redis = require('./redis');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const prettyjson = require('prettyjson');

const { stderr, stdout } = require('process');

const TAG = "[bull_manager]";

const taskQueue = new Queue('tasks', 'redis://127.0.0.1:6379');

async function addTaskToQueue(username, file, taskKey) {
    taskQueue.add({ username, file, taskKey }, { attempts: 1, timeout: 10000});
    console.log(TAG, "add to taskQueue finished");
}

async function runTaskScript(username, taskKey) {
    return new Promise((resolve, reject) => {
        const script_path = path.resolve(__dirname, 'process_task.py')
        const command = `python3  ${script_path} -u ${username} -t ${taskKey}`;
        exec(command, (error, stdout, stderr) => {
            console.log(TAG, `command = ${command}`);
            if (error) {
                console.log(TAG, `exec error: ${error}`)
                reject(TAG, `exec error: ${error}`);
                return;
            }
            if (stderr) {
                console.log(TAG, `stderr: ${stderr}`);
                reject(TAG, `stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.log(TAG, `${username}: ${taskKey} task done, stdout: ${stdout}`);
            resolve(TAG, `${username}: ${taskKey} task done`);
        });
        // resolve(`task done`);
    });
}

const processTask = (async (job, done) => {
    const { username, file, taskKey } = job.data;
    console.log(TAG, `check task to be processed: ${username}, ${taskKey}`);
    const status = await redis.getTaskStatusFromRedis(username, taskKey);
    // console.log(TAG, `\n`, prettyjson.render(status));
    try {
        console.log(TAG, "check task status before start process:", username, taskKey, status);
        await redis.setTaskStatusToRedis(username, taskKey, 'processing');
        
        console.log(TAG, `start processing task ${username}: ${taskKey}...`);
        await runTaskScript(username, taskKey);
        console.log(TAG, `task ${username}: ${taskKey} process finished`);

        const result = await redis.setTaskStatusToRedis(username, taskKey, 'Done', '/resources/christmas_bear_ply/christmas_bear.ply');
        done(null, JSON.stringify(result));
        
    } catch (error) {
        await redis.setTaskStatusToRedis(username, taskKey, 'Failed');
        console.error(TAG, `error happened in processing task ${username}: ${taskKey}`);
        console.error(TAG, error);
    }
});

taskQueue.on('completed', (job, result) => {
    const { username, file, taskKey } = job.data;
    console.log(TAG, `Job ${job.id}: ${taskKey} is completed, ${result}`);
    // Automatically discard failed jobs
    // job.remove().then(() => {
    //     console.log(TAG, `Completed job ${job.id}: ${taskKey} removed from the queue`);
    // }).catch((err) => {
    //     console.error(TAG, `Failed to remove completed job ${job.id}:${taskKey} ${err.message}`);
    // });
});

taskQueue.on('failed', (job, err) => {
    const { username, file, taskKey } = job.data;
    console.log(`Job ${job.id}: ${taskKey} failed with error: ${err.message}`);
    // job.remove().then(() => {
    //     console.log(TAG, `Failed job ${job.id}: ${taskKey} removed from the queue`);
    // }).catch((err) => {
    //     console.error(TAG, `Failed to remove job ${job.id}:${taskKey} ${err.message}`);
    // });
});

taskQueue.on('active', (job, jobPromise) => {
    const {username, file, taskKey} = job.data;
    console.log(TAG, `job ${username} ${taskKey} now set to active and is ready to be processed`);
})

taskQueue.on('stalled', async (job) => {
    const { username, file, taskKey } = job.data;
    console.log(`Job ${job.id}:  ${taskKey} is stalled`);
    try {
      // Move the stalled job to the failed state
      await job.moveToFailed({ message: 'Job stalled' }, true);
      console.log(`Stalled job ${job.id}: ${taskKey} moved to failed state`);
    } catch (err) {
      console.error(`Failed to move job ${job.id}: ${taskKey} to failed state: ${err.message}`);
    }
});

taskQueue.process(1, processTask);

// taskQueue.process(1, async (job) => {
//     const { username, file, taskKey } = job.data;
//     console.log(TAG, `check task to be processed: ${username}, ${taskKey}`);
//     const status = await redis.getTaskStatusFromRedis(username, taskKey);
//     console.log(TAG, prettyjson.render(status));
//     try {
//         console.log(TAG, "check task status before start process:", username, taskKey);
//         await redis.setTaskStatusToRedis(username, taskKey, 'processing');
        
//         console.log(TAG, "do something to process task");
//         await runTaskScript(username, taskKey);
//         await redis.setTaskStatusToRedis(username, taskKey, 'Done');
//     } catch (error) {
//         await redis.setTaskStatusToRedis(username, taskKey, 'Failed');
//         console.error(TAG, `error happened in processing task ${username} ${taskKey}`);
//         console.error(TAG, error);
//     }
// });
module.exports = { taskQueue, addTaskToQueue };
