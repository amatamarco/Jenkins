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

import { Crash } from '@mdf.js/crash';
import { type Health, Jobs, Plugs } from '@mdf.js/firehose';
import { Consumer } from '@mdf.js/kafka-provider';
import { Logger, type LoggerInstance } from '@mdf.js/logger';
import crypto from 'crypto';
import EventEmitter from 'events';
import type { EachMessagePayload, KafkaMessage } from 'kafkajs';
import { v4 } from 'uuid';
import { SourceOptions } from '../../types';
import { CONFIG_KAFKA_TOPICS } from '../const';

export declare interface FlowSource {
  /** Emitted when the component throw an error*/
  on(event: 'error', listener: (error: Crash | Error) => void): this;
  /** Emitted on every status change */
  on(event: 'status', listener: (status: Health.Status) => void): this;
  /** Emitted when there is a new job to be managed */
  on(event: 'data', listener: (job: Jobs.JobObject) => void): this;
  /** Emitted before a listener is added to its internal array of listeners */
  on(event: 'newListener', listener: (eventName: string) => void): this;
  /** Emitted after the listener is removed. */
  on(event: 'removeListener', listener: (eventName: string) => void): this;
}

export class FlowSource extends EventEmitter implements Plugs.Source.Flow {
  /** Component identifier */
  public readonly componentId = v4();
  /** Component name */
  public readonly name: string;
  /** Topic subscription paused flag */
  private subscriptionPaused: boolean;
  /** Topic subscription done flag */
  private subscriptionDone: boolean;
  /** Topic subscribing flag */
  private subscriptionDoing: boolean;
  /** Kafka consumer provider */
  private readonly provider: Consumer.Provider;
  /** Kafka topics */
  private readonly topics: string[];
  /** Logger instance */
  private readonly logger: LoggerInstance;

  /**
   * Create a new instance of the FlowSource class
   * @param config - Configuration object
   */
  constructor(config: SourceOptions) {
    super();
    this.name = config.name ?? 'kafka-source';
    this.logger = config.logger ?? new Logger(this.name);
    this.topics = config.topics ?? (config.useEnvironment ? CONFIG_KAFKA_TOPICS : []);
    this.subscriptionPaused = false;
    this.subscriptionDone = false;
    this.subscriptionDoing = false;
    this.provider = Consumer.Factory.create({ ...config, logger: this.logger });
    this.on('newListener', this.onListenerEvent);
    this.on('removeListener', this.onListenerEvent);
    this.provider.on('status', this.onProviderStatusEvent);
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
  public start(): Promise<void> {
    return this.provider.start();
  }
  /** Stop the provider */
  public stop(): Promise<void> {
    return this.provider.stop();
  }
  /** Close the provider */
  public close(): Promise<void> {
    return this.provider.close();
  }
  /** Enable consuming process */
  public init(): void {
    if (this.subscriptionPaused) {
      try {
        this.provider.client.resume(this.topics.map(topic => ({ topic })));
        this.subscriptionPaused = false;
        // Stryker disable next-line all
        this.logger.verbose(`The source has been initialized`);
      } catch (rawError) {
        const cause = Crash.from(rawError);
        this.emit(
          `error`,
          new Crash(`Error while resuming the consumer: ${cause.message}`, this.componentId, {
            cause,
          })
        );
      }
    }
    this.tryToSubscribe();
  }
  /** Stop consuming process */
  public pause(): void {
    this.logger.debug(`Pause request received`);
    if (!this.subscriptionPaused && this.subscriptionDone) {
      try {
        this.provider.client.pause(this.topics.map(topic => ({ topic })));
        this.subscriptionPaused = true;
      } catch (rawError) {
        const cause = Crash.from(rawError);
        this.emit(
          `error`,
          new Crash(`Error while pausing the consumer: ${cause.message}`, this.componentId, {
            cause,
          })
        );
      }
    }
  }
  /**
   * Perform the task to clean the job registers after the job has been resolved
   * @param jobUserId - Job entry identification
   * @returns - the job entry identification that has been correctly removed or undefined if the job
   * was not found
   */
  public async postConsume(jobUserId: string): Promise<string | undefined> {
    let partition: number;
    let offset: string;
    let topic: string;
    try {
      const [partitionString, offsetString, topicString] = jobUserId.split('*');
      partition = Number(partitionString);
      offset = (Number(offsetString) + 1).toString();
      topic = topicString;
      await this.provider.client.commitOffsets([{ topic, partition, offset }]);
      return jobUserId;
    } catch (rawError) {
      const cause = Crash.from(rawError);
      throw new Crash(`Error while committing offset: ${cause.message}`, this.componentId, {
        cause,
      });
    }
  }
  /**
   * Create an firehose standard job from the incoming message
   * @param message - Incoming message
   * @param partition - Source partition of incoming message
   * @returns
   */
  private createJob(message: KafkaMessage, partition: number, topic: string): Jobs.JobObject {
    if (!this.topics.includes(topic)) {
      throw new Crash(
        `A message from other topic [${topic}] has been received, this is because the groupId has been reused`,
        this.componentId
      );
    }
    if (!message.value) {
      throw new Crash(
        `No value in the Kafka message, it looks like an empty message`,
        this.componentId
      );
    }
    try {
      const jobUserId = `${partition}*${message.offset}*${topic}`;
      const jobUserUUID = crypto.createHash('sha256').update(jobUserId).digest('hex');
      const uuid = v4();
      const status = Jobs.Status.PROCESSING;
      const data = JSON.parse(message.value.toString());
      const type = data.messageType;
      const headers: Jobs.AnyHeaders = {
        type,
        routing: data.routing,
        messageType: data.messageType,
        timestamp: data.timestamp,
        variableId: data.variableId,
      };
      return { jobUserId, jobUserUUID, type, data, options: { headers }, uuid, status };
    } catch (rawError) {
      const cause = Crash.from(rawError);
      throw new Crash(
        `Error parsing the kafka message to plain JSON object: ${cause.message}`,
        this.componentId,
        { cause }
      );
    }
  }
  /** Flag that indicates if all the conditions to ingest are met */
  private get isIngestEnabled(): boolean {
    return (
      this.listenerCount('data') > 0 &&
      !this.subscriptionPaused &&
      this.provider.state === 'running'
    );
  }
  /**
   * Check if all the conditions for data ingestion are met.
   * The first time that all the conditions are met, the subscription to the streams are performed,
   * then, by the use of the `init` and `pause` method, the firehose will manage the messages
   */
  private tryToSubscribe(): void {
    if (this.isIngestEnabled && !this.subscriptionDone && !this.subscriptionDoing) {
      // Stryker disable next-line all
      this.logger.silly(`Executing ingest for new entries`);
      this.subscriptionDoing = true;
      this.provider.client
        .subscribe({ topics: this.topics, fromBeginning: true })
        .then(() => this.provider.client.run({ autoCommit: false, eachMessage: this.eachMessage }))
        .then(() => {
          this.subscriptionDone = true;
          // Stryker disable next-line all
          this.logger.verbose(`The source has been subscribed`);
        })
        .catch(rawError => {
          const cause = Crash.from(rawError);
          this.emit(
            'error',
            new Crash(`Error while subscribing the consumer: ${cause.message}`, this.componentId, {
              cause,
            })
          );
        })
        .finally(() => {
          this.subscriptionDoing = false;
        });
    }
  }
  /** Event handler for listeners events */
  private readonly onListenerEvent = (eventName: string) => {
    if (eventName === 'data') {
      this.logger.debug(`New event on data listener`);
      this.tryToSubscribe();
    }
  };
  /** Event handler for provider status events */
  private readonly onProviderStatusEvent = (status: Health.Status) => {
    // Stryker disable next-line all
    this.logger.debug(`New status event: ${status}`);
    this.tryToSubscribe();
  };
  /**
   * Message handler function
   * @param payload - Message to be handled
   * @returns
   */
  private readonly eachMessage = async (payload: EachMessagePayload): Promise<void> => {
    try {
      const job = this.createJob(payload.message, payload.partition, payload.topic);
      if (!this.subscriptionPaused && this.listenerCount('data') > 0) {
        this.logger.debug(
          'No more data will be consumed until the current subscription is resumed'
        );
      }
      this.emit('data', job);
    } catch (rawError) {
      const cause = Crash.from(rawError);
      const error = new Crash(`Error while handling the message`, this.componentId, { cause });
      this.emit('error', error);
      throw error;
    }
  };
}
