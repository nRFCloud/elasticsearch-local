"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = exports.start = exports.esContainer = void 0;
const debug_1 = require("debug");
const dockerode_1 = __importDefault(require("dockerode"));
const needle = require("needle");
const util_1 = require("util");
const stream_1 = require("stream");
const setTimeoutPromise = util_1.promisify((time, callback) => setTimeout(callback, time));
const logger = debug_1.debug("elasticsearch-local-docker");
const docker = new dockerode_1.default();
const pullPromise = util_1.promisify(docker.pull);
let PORT = 9200;
let ES_URL = `http://localhost:9200`;
const ES_IMAGE = `elasticsearch:7.13.2`;
const NAME = 'elasticsearch-local-docker';
async function start(options) {
    const { port = 9200, indexes = [], } = options;
    PORT = port;
    ES_URL = `http://localhost:${PORT}`;
    const image = await docker.createImage({
        fromImage: ES_IMAGE
    });
    const nullStream = new (class extends stream_1.Writable {
        constructor() {
            super(...arguments);
            this._write = () => { };
        }
    })();
    image.pipe(nullStream);
    if (image.readable) {
        logger("Waiting for image");
        await new Promise(fulfill => image.on("end", fulfill));
    }
    exports.esContainer = await findExistingContainer();
    if (exports.esContainer == null) {
        exports.esContainer = await startNewContainer(port);
    }
    await waitForES();
    await createIndexes(ES_URL, indexes);
}
exports.start = start;
async function waitForES() {
    while (true) {
        await setTimeoutPromise(500);
        const res = await needle('get', ES_URL, { json: true }).catch(err => null);
        if (res?.statusCode == 200) {
            logger("ES container is up and running");
            break;
        }
    }
}
async function startNewContainer(port) {
    logger("Creating new ES container");
    const container = await docker.createContainer({
        name: NAME,
        Image: ES_IMAGE,
        Env: ['discovery.type=single-node', 'ES_JAVA_OPTS=-Xms750m -Xmx750m'],
        HostConfig: {
            PortBindings: {
                [`${port}/tcp`]: [
                    { HostIp: "0.0.0.0", HostPort: port.toString() },
                ],
            },
        }
    });
    await container.start();
    return container;
}
async function createIndexes(esUrl, indices) {
    logger("Wiping out all current indices");
    const deleteRes = await needle("delete", `${esUrl}/_all`, {});
    for (const { name, body } of indices) {
        logger(`Creating ${name} index`);
        const indexCreate = await needle("post", `${esUrl}/${name}`, body, { json: true });
    }
}
async function findExistingContainer() {
    const containers = await docker.listContainers();
    for (const container of containers) {
        if (container.Names.find(value => value.includes(NAME)) && container.Image === ES_IMAGE) {
            logger(`found existing ES container ${container.Id}`);
            return docker.getContainer(container.Id);
        }
    }
    return null;
}
async function stop() {
    await exports.esContainer.stop();
    await exports.esContainer.remove();
}
exports.stop = stop;
//# sourceMappingURL=index.js.map