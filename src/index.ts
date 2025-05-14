/**
 * Copyright 2024 Mytra Control S.L. All rights reserved.
 * Note: All information contained herein is, and remains the property of Mytra Control S.L. and its
 * suppliers, if any. The intellectual and technical concepts contained herein are property of
 * Mytra Control S.L. and its suppliers and may be covered by European and Foreign patents, patents
 * in process, and are protected by trade secret or copyright.
 *
 * Dissemination of this information or the reproduction of this material is strictly forbidden
 * unless prior written permission is obtained from Mytra Control S.L.
 */

import { Firehose } from '@mdf.js/firehose';
import { ServiceRegistry } from '@mdf.js/service-registry';
import { CONFIG_CUSTOM_PRESET_FIREHOSE_FILE, CONFIG_FIREHOSE_FILE } from './firehose/config';
import { JetSink } from './firehose/kafka/sink';
import { FlowSource } from './firehose/kafka/source/FlowSource';
import { SinkOptions, SourceOptions } from './firehose/types';
import { start } from './main';

const serviceRegistry = new ServiceRegistry(
  {
    useEnvironment: true,
    loadReadme: true,
    loadPackage: true,
  },
  {
    configLoaderOptions: {
      configFiles: [CONFIG_FIREHOSE_FILE, CONFIG_CUSTOM_PRESET_FIREHOSE_FILE],
    },
  }
);

const sourceConfig: SourceOptions = serviceRegistry.customSettings.source;
const sinkConfig: SinkOptions = serviceRegistry.customSettings.sink;

const source = new FlowSource(sourceConfig);
const sink = new JetSink(sinkConfig);

const firehose = new Firehose('Firehose-Kafka-Kafka', {
  sinks: [sink],
  sources: [source],
  logger: serviceRegistry.logger,
});

start(firehose, serviceRegistry);
