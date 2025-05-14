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
process.env.CONFIG_CUSTOM_PRESET_FIREHOSE_FILE = 'config/custom/presets/firehose.preset.yaml';
process.env.CONFIG_FIREHOSE_FILE = 'config/firehose.config.yaml';

import { Firehose } from '@mdf.js/firehose';
import { ServiceRegistry } from '@mdf.js/service-registry';
import { CONFIG_CUSTOM_PRESET_FIREHOSE_FILE, CONFIG_FIREHOSE_FILE } from './firehose/config';
import { FlowSource } from './firehose/kafka';
import { JetSink } from './firehose/kafka/sink';
import { SinkOptions, SourceOptions } from './firehose/types';
import { start } from './main';

let serviceRegistry: ServiceRegistry;
let firehose: Firehose;
describe('#Main tests', () => {
  beforeEach(() => {
    serviceRegistry = new ServiceRegistry(
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
    const flowSource = new FlowSource(sourceConfig);
    const jetSink = new JetSink(sinkConfig);
    firehose = new Firehose('Agbar-Firehose-Kafka-Kafka', {
      sinks: [jetSink],
      sources: [flowSource],
      logger: serviceRegistry.logger,
    });
  });
  it('#Should start correctly', () => {
    const appStartSpy = jest.spyOn(serviceRegistry, 'start').mockResolvedValue();
    start(firehose, serviceRegistry);
    expect(appStartSpy).toHaveBeenCalledTimes(1);
  });
  it('#Should start not correctly', () => {
    const appStartSpy = jest
      .spyOn(serviceRegistry, 'start')
      .mockRejectedValue(new Error('testError'));
    try {
      start(firehose, serviceRegistry);
    } catch (error) {
      expect(appStartSpy).toHaveBeenCalledTimes(1);
      expect(error).toBeDefined();
    }
  });
  it('#Should receive the events', () => {
    const appStartSpy = jest.spyOn(serviceRegistry, 'start').mockResolvedValue();
    const loggerErrorSpy = jest.spyOn(serviceRegistry.logger, 'error');
    const loggerinfoSpy = jest.spyOn(serviceRegistry.logger, 'info');
    start(firehose, serviceRegistry);
    firehose.emit('error', 'testError');
    firehose.emit('status', 'testStatus');
    expect(appStartSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerinfoSpy).toHaveBeenCalledTimes(1);
  });
});
