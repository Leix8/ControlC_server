const express = require('express');
const app = express();
app.use(express.json());

const multer = require('multer');
const upload = multer({ dest: 'public/inputs/' });

const path = require('path');

const { taskQueue, addTaskToQueue } = require('./bull_manager');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const port = 8448;
const TAG = "[ControlC_server]";

let redis = require("./redis");

app.get('/test', async (req, res) => {
    console.log(TAG, "test request received, ControlC_server is running at https");
    res.send( "ControlC_server is running at https" );
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const { username } = req.body;
    const file = req.file;

    if (!username || !file) {
        return res.status(400).send('Username and file are required.');
    }

    const taskKey = `${username}-${Date.now()}`;
    let result = await redis.addNewTaskToRedis(username, taskKey);
    console.log(TAG, "adding new task to redis finished");
    await addTaskToQueue(username, file, taskKey);
    res.send(result);
});

app.get('/checkStatus', async (req, res) => {
    const username = req.query.username;
    const taskKey =  req.query.key;
    console.log(TAG, "querying for: ", username, taskKey);

    if (!username || !taskKey) {
        return res.status(400).send('Username and task key are required.');
    }
    res.send(await redis.getTaskStatusFromRedis(username, taskKey));
});

app.get('/download', async (req, res) => {
    const { username, taskKey } = req.query;

    if (!username || !taskKey) {
        return res.status(400).send('Username and task key are required.');
    }

    const task = await redis.getTaskStatusFromRedis(username, taskKey);
    if (task.status === 'Done') {
        const filePath = path.join(__dirname, 'public/outputs', task.outputFile);
        res.download(filePath);
    } else {
        res.status(400).send('Task is not completed yet.');
    }
});

// Set up Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(taskQueue)],
  serverAdapter
});

app.use('/admin/queues', serverAdapter.getRouter());

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Bull Board is available at http://localhost:${PORT}/admin/queues`);
});

app.listen(port, () => {
    console.log(TAG, `ControlC server running at http://localhost:${port}`);
});
