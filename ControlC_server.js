const express = require('express');
const multer = require('multer');
const path = require('path');
const { addTaskToQueue } = require('./bull_manager');
// const { getTaskFromRedis } = require('./redis');
let redis = require("./redis");
const app = express();
const port = 8448;

const upload = multer({ dest: 'public/inputs/' });

app.use(express.json());

app.get('/test', async (req, res) => {
    console.log("test request received, ControlC_server is running at https");
    res.send( "ControlC_server is running at https" );
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const { username } = req.body;
    const file = req.file;

    if (!username || !file) {
        return res.status(400).send('Username and file are required.');
    }

    const taskKey = `${username}-${Date.now()}`;
    await redis.addNewTaskToRedis(username, taskKey);
    console.log("[ControlC_server] adding new task to redis passed");
    await addTaskToQueue(username, file, taskKey);

    res.send({ taskKey });
});

app.get('/checkStatus', async (req, res) => {
    const username = req.query.username;
    const taskKey =  req.query.taskKey;
    console.log("querying for: ", username, taskKey);

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

app.listen(port, () => {
    console.log(`ControlC server running at http://localhost:${port}`);
});
