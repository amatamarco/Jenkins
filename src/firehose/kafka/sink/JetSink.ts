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
import type { Crash } from '@mdf.js/crash';
import { LoggerInstance, Plugs, type Health, type Jobs } from '@mdf.js/firehose';
import { Producer } from '@mdf.js/kafka-provider';
import { Logger } from '@mdf.js/logger';
import EventEmitter from 'events';
import { Counter, Histogram, Registry } from 'prom-client';
import { v4 } from 'uuid';
import { SinkOptions } from '../../types';
import { CONFIG_KAFKA_TOPIC_NAMESPACE } from '../const';
import { IngestRepository } from './IngestRepository';

/** Metric types */
type Metrics = {
  /** Counter for single operations */
  singleOperationsCounter: Counter;
  /** Counter for multi operations */
  multiOperationsCounter: Counter;
  /** Histogram for single operation duration */
  singleOperationDuration: Histogram;
  /** Histogram for multi operation duration */
  multiOperationDuration: Histogram;
  /** Histogram for multi operation size */
  multiOperationSize: Histogram;
};

export declare interface JetSink {
  /** Emitted when the component throw an error*/
  on(event: 'error', listener: (error: Crash | Error) => void): this;
  /** Emitted on every status change */
  on(event: 'status', listener: (status: Health.Status) => void): this;
}

export class JetSink extends EventEmitter implements Plugs.Sink.Jet {
  /** Component identifier */
  public readonly componentId = v4();
  /** Component name */
  public readonly name: string;
  /** Registry for prometheus metrics */
  public readonly metrics: Registry;
  /** Metrics instances */
  private readonly stats: Metrics;
  /** Kafka access repository */
  private readonly repository: IngestRepository;
  /** Kafka producer provider */
  private readonly provider: Producer.Provider;
  /** Kafka topics namespace */
  private readonly namespace: string;
  /** Logger instance */
  private readonly logger: LoggerInstance;

  /**
   * Create a new instance of the JetSink
   * @param config - configuration object
   */
  constructor(config: SinkOptions) {
    super();
    this.name = config.name ?? 'kafka-sink';
    this.logger = config.logger ?? new Logger(this.name);
    this.namespace =
      config.namespace ?? (config.useEnvironment ? CONFIG_KAFKA_TOPIC_NAMESPACE : '');
    this.provider = Producer.Factory.create(config);
    this.repository = new IngestRepository(this.provider, this.logger, this.namespace);
    this.metrics = new Registry();
    this.metrics.setDefaultLabels({ plug: 'kafka-sink' });
    this.stats = this.defineMetrics(this.metrics);
  }

  /** Getter of the health checks */
  public get checks(): Health.Checks {
    return this.provider.checks;
  }
  /** Getter of the health status */
  public get status(): Health.Status {
    return this.provider.status;
  }
  /** Start the provider */
  public async start(): Promise<void> {
    return this.provider.start();
  }
  /** Stop the provider */
  public async stop(): Promise<void> {
    return this.provider.stop();
  }
  /** Close the provider */
  public async close(): Promise<void> {
    return this.provider.close();
  }
  /**
   * Send single job to the broker
   * @param job - job to be processed
   * @returns
   */
  public async single(job: Jobs.JobObject): Promise<void> {
    const hrstart = process.hrtime();
    this.logger.debug(`New single ${job.type} job to be processed`);
    await this.repository.send(job);
    const hrend = process.hrtime(hrstart);
    this.stats.singleOperationsCounter.inc({ type: job.type });
    this.stats.singleOperationDuration.observe({ type: job.type }, this.toMilliseconds(hrend));
  }
  /**
   * Send several jobs to the broker
   * @param jobs - jobs to be processed
   * @returns
   */
  public async multi(jobs: Jobs.JobObject[]): Promise<void> {
    const hrstart = process.hrtime();
    this.logger.debug(`New multi with ${jobs.length} jobs to be processed`);
    await this.repository.bulkSend(jobs);
    const hrend = process.hrtime(hrstart);
    const stats = jobs.reduce((acc, job) => {
      if (!acc[job.type]) {
        acc[job.type] = 0;
      }
      acc[job.type]++;
      return acc;
    }, {} as Record<string, number>);
    for (const type in stats) {
      this.stats.multiOperationsCounter.inc({ type }, stats[type]);
    }
    this.stats.multiOperationDuration.observe(this.toMilliseconds(hrend));
    this.stats.multiOperationSize.observe(jobs.length);
  }

  /**
   * Define the metrics over a registry
   * @param register - The registry to register the metrics
   * @returns The metric instances
   */
  private defineMetrics(register: Registry): Metrics {
    return {
      singleOperationsCounter: new Counter({
        name: 'plug_single_operations_total',
        help: 'The total number of single operations',
        labelNames: ['type', 'plug'],
        registers: [register],
      }),
      singleOperationDuration: new Histogram({
        name: 'plug_single_operation_duration_seconds',
        help: 'The duration of single operations',
        buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
        labelNames: ['type', 'plug'],
        registers: [register],
      }),
      multiOperationsCounter: new Counter({
        name: 'plug_multi_operations_total',
        help: 'The total number of multi operations',
        labelNames: ['type', 'plug'],
        registers: [register],
      }),
      multiOperationDuration: new Histogram({
        name: 'plug_multi_operation_duration_seconds',
        help: 'The duration of multi operations',
        buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
        labelNames: ['plug'],
        registers: [register],
      }),
      multiOperationSize: new Histogram({
        name: 'plug_multi_operation_size',
        help: 'The size of multi operations',
        buckets: [5, 10, 50, 100, 250, 500, 1000, 2000],
        labelNames: ['plug'],
        registers: [register],
      }),
    };
  }
  /**
   * Convert hrtime to milliseconds
   * @param hrtime - hrtime to be converted
   * @returns The milliseconds
   */
  private toMilliseconds(hrtime: [number, number]): number {
    return hrtime[0] * 1000 + hrtime[1] / 1000000;
  }
}
