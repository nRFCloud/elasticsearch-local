import {debug} from 'debug';

import Docker, { Container } from "dockerode"
import needle = require("needle")
import {promisify} from 'util';

const setTimeoutPromise = promisify((time: number, callback: (err: any, data: any) => void) => setTimeout(callback, time))
const logger = debug("elasticsearch-local-docker")
interface StartESOptions {
  port?: number;
  indexes?: ESIndex[];
}

interface ESIndex {
  name: string;
  // Body, which will be sent ot create index, see https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html#indices-create-index
  body: Record<string, unknown>;
}

const docker = new Docker()
let PORT = 9200;
let ES_URL = `http://localhost:9200`
export let esContainer: Container;
const ES_IMAGE = `elasticsearch:7.13.2`
const NAME = 'elasticsearch-local-docker'

export async function start(options: StartESOptions) {
  const {
    port = 9200,
    indexes = [],
  } = options;

  PORT = port;

  ES_URL = `http://localhost:${PORT}`;

  await docker.pull(ES_IMAGE)

  esContainer = await findExistingContainer();
  if (esContainer == null) {
    esContainer = await startNewContainer(port);
  }
  await waitForES();
  await createIndexes(ES_URL, indexes)
}

async function waitForES() {
  while (true) {
    await setTimeoutPromise(500)
    const res = await needle('get',ES_URL, {json: true}).catch(err => null)
    if (res?.statusCode == 200) {
      logger("ES container is up and running")
      break;
    }
  }
}

async function startNewContainer(port: number) {
  logger("Creating new ES container")

  const container = await docker.createContainer({
    name: NAME,
    Image: ES_IMAGE,
    Env: ['discovery.type=single-node', 'ES_JAVA_OPTS=-Xms750m -Xmx750m'],
    HostConfig: {
      PortBindings: {
        [`${port}/tcp`]: [
          {HostIp: "0.0.0.0", HostPort: port.toString()},
        ],
      },
    }
  })
  await container.start()
  return container
}

async function createIndexes(esUrl: string, indices: ESIndex[]) {
  logger("Wiping out all current indices")
  const deleteRes = await needle("delete", `${esUrl}/_all`, {})
  for (const {name, body} of indices) {
    logger(`Creating ${name} index`)
    const indexCreate = await needle("post", `${esUrl}/${name}`, body, {json: true})
  }
}

async function findExistingContainer() {
  const containers = await docker.listContainers()
  for (const container of containers) {
    if (container.Names.find(value => value.includes(NAME)) && container.Image === ES_IMAGE) {
      logger(`found existing ES container ${container.Id}`)
      return docker.getContainer(container.Id)
    }
  }
  return null;
}

export async function stop(){
  await esContainer.stop();
  await esContainer.remove();
}
