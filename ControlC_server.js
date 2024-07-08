const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json());

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log(req.body)
        //cb函数设置保存路径，__dirname为当前文件所在目录
        let root_path = path.join(__dirname, "public", "inputs")
        cb(null, root_path)
    },

    filename: function (req, file, cb) {
        //文件名 = 时间戳 + 文件名
        let filename = "input_" + new Date().getTime() + "_" + file.originalname
        //cb函数设置filename
        cb(null, filename)
    }
})
const upload = multer({ storage: storage });

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

app.post('/upload', upload.fields([{ name: 'input_video', maxCount: 1 }]), async (req, res) => {
    const { username } = req.body;
    // const file = req.file;
    const input_video = req.files['input_video'][0];

    if (!username || !input_video) {
        return res.status(400).send('Username and file are required.');
    }
    console.log(TAG, "check input video:", input_video);

    const taskKey = input_video.filename;
    let result = await redis.addNewTaskToRedis(username, taskKey);
    console.log(TAG, "adding new task to redis finished");
    await addTaskToQueue(username, input_video.path, taskKey);
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
