# elasticsearch-local-docker

> Run ES 7.13.2 locally in docker

## Usage

### 1. Start Elasticsearch

```js
import {start} from '@shelf/elasticsearch-local';

await start({
  port: 9000, // optional
  indexes: [
    {
      name: 'your-index',
      // create index with options - https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html#indices-create-api-request-body
      body: {
        settings: {
          number_of_shards: '1',
          number_of_replicas: '1'
        },
        aliases: {
          'some-acc-id': {}
        },
        mappings: {
          "properties": {
            "field1" : {"type" : "text"}
        }
      }
    }
  ] // optional
});
```

### 2. Stop Elasticsearch

```js
import {stop} from '@shelf/elasticsearch-local';

await stop();
```
