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
import { Crash, Multi } from '@mdf.js/crash';
import type { Jobs } from '@mdf.js/firehose';
import type { Producer } from '@mdf.js/kafka-provider';
import type { LoggerInstance } from '@mdf.js/logger';
import type { RecordMetadata, TopicMessages } from 'kafkajs';
import { SEND_OPTIONS } from '../const';

export class IngestRepository {
  /**
   * Create a new instance of the IngestRepository
   * @param provider - instance of the kafka provider
   * @param logger - logger instance
   */
  constructor(
    private readonly provider: Producer.Provider,
    private readonly logger: LoggerInstance,
    private readonly namespace: string
  ) {}
  /**
   * Convert a Firehose Job to a Kafka message and send it to Kafka
   * @param job - job to be processed
   * @returns
   */
  public async send(job: Jobs.JobObject): Promise<void> {
    if (this.provider.state !== 'running') {
      throw new Crash(`The provider is not ready in this moment`, this.provider.componentId);
    }
    try {
      const message = this.createMessageFromJob(job);
      const result = await this.provider.client.send({ ...message, ...SEND_OPTIONS });
      await this.checkResults(result);
    } catch (rawError) {
      const cause = Crash.from(rawError);
      throw new Crash(`Error sending a job: ${cause.message}`, this.provider.componentId, {
        cause,
      });
    }
  }
  /**
   * Convert an array of Firehose Jobs to a Kafka messages send them to Kafka
   * @param jobs - jobs to be processed
   * @returns
   */
  public async bulkSend(jobs: Jobs.JobObject[]): Promise<void> {
    if (this.provider.state !== 'running') {
      throw new Crash(`The provider is not ready in this moment`, this.provider.componentId);
    }
    try {
      const topicMessages = this.groupMessagesByTopic(jobs);
      const result = await this.provider.client.sendBatch({
        topicMessages,
        ...SEND_OPTIONS,
      });
      await this.checkResults(result);
    } catch (rawError) {
      const cause = Crash.from(rawError);
      throw new Crash(`Error streaming jobs: ${cause.message}`, this.provider.componentId, {
        cause,
      });
    }
  }
  /**
   * Return an array of messages from requested jobs, grouping the messages per topic
   * @param jobs - jobs to be processed
   * @returns
   */
  private groupMessagesByTopic(jobs: Jobs.JobObject[]): TopicMessages[] {
    const topicMap: Map<string, TopicMessages> = new Map();
    for (const message of jobs.map(job => this.createMessageFromJob(job))) {
      const topicEntry = topicMap.get(message.topic);
      if (topicEntry) {
        topicEntry.messages = topicEntry.messages.concat(message.messages);
      } else {
        topicMap.set(message.topic, message);
      }
    }
    return Array.from(topicMap.values());
  }
  /**
   * Return a new record from the requested job
   * @param job - job to be processed
   */
  private createMessageFromJob(job: Jobs.JobObject): TopicMessages {
    const jobData = job.data;
    let topic = `${this.namespace}.${jobData.routing.topic}`;
    if (jobData.origin) {
      topic = `${topic}.${jobData.origin}`;
    }
    return { topic, messages: [{ value: JSON.stringify(jobData) }] };
  }
  /**
   * Check the result of a send operation
   * @param result - Result of send operation
   * @returns
   */
  private async checkResults(result: RecordMetadata[]): Promise<void> {
    const multi: Multi = new Multi(`Some data showed some errors`, this.provider.componentId);
    for (const metadata of result) {
      if (metadata.errorCode > 0) {
        multi.push(
          new Crash(
            `Error in topic ${metadata.topicName} in partition ${metadata.partition}: ${metadata.errorCode}`,
            this.provider.componentId,
            {
              info: {
                error: metadata.errorCode,
                topic: metadata.topicName,
                partition: metadata.partition,
              },
            }
          )
        );
      }
    }
    if (multi.size > 0) {
      //Stryker disable next-line all
      this.logger.debug(`Operation with ${multi.size} errors of [${result.length}] items`);
      throw multi;
    }
    //Stryker disable next-line all
    this.logger.debug(`Operation done for [${result.length}] items`);
  }
}
