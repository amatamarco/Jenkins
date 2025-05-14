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
import { Jobs } from '@mdf.js/firehose';
import type { RecordMetadata } from 'kafkajs';
import { JobData, SinkOptions } from '../../types';
import { JetSink } from './index';

const SINK_CONFIG: SinkOptions = {
  name: 'kafka-sink-test',
  namespace: 'Level_3_5',
};
const FAKE_UUID = '213d630f-7517-4370-baae-d0a5862799f5';
const jobBase = {
  routing: {
    topic: 'Energia.Medida.EDGE_Montcada.PLC10CLX',
  },
  messageType: 'Medida',
  timestamp: 1731595184,
  variableId: 'PWPT02ACOM',
};
const jobData: JobData = {
  ...jobBase,
  dataType: 'Real',
  value: 50.5,
  quality: 'GOOD',
};
const jobHeaders = {
  type: 'Medida',
  ...jobBase,
};
const job1: Jobs.JobObject = {
  type: 'Medida',
  data: jobData,
  options: { headers: jobHeaders },
  jobUserId: 'myUserID',
  jobUserUUID: FAKE_UUID,
  status: Jobs.Status.PENDING,
  uuid: FAKE_UUID,
};
const job2: Jobs.JobObject = { ...job1, data: { ...job1.data, value: 60.0 } };
const job3: Jobs.JobObject = {
  ...job1,
  data: {
    ...job1.data,
    routing: { topic: 'Otras_Variables.Medida.EDGE_Montcada.PLC10CLX' },
    quality: 'GOOD',
  },
};
const resultWithoutErrors: RecordMetadata[] = [
  { errorCode: 0, partition: 0, topicName: 'd' },
  { errorCode: 0, partition: 1, topicName: 'd' },
];
const resultWithErrors: RecordMetadata[] = [
  { errorCode: 500, partition: 0, topicName: 'd' },
  { errorCode: 0, partition: 1, topicName: 'd' },
  { errorCode: 0, partition: 1, topicName: 'd' },
];
describe('#JetSink #Kafka', () => {
  describe('#Happy path', () => {
    it('Should create a new instance of the JetSink class with configuration object', () => {
      const sink = new JetSink(SINK_CONFIG);
      expect(sink).toBeDefined();
    });
    it('Should create a new valid instance of the JetSink class with environment variables', () => {
      const sink1 = new JetSink({ useEnvironment: true });
      const sink2 = new JetSink({ useEnvironment: false });
      expect(sink1).toBeDefined();
      expect(sink2).toBeDefined();
      expect(sink1.name).toEqual('kafka-sink');
      expect(sink2.name).toEqual('kafka-sink');
      // @ts-expect-error - Test private property
      expect(sink1.namespace).toEqual('');
      // @ts-expect-error - Test private property
      expect(sink2.namespace).toEqual('');
    }, 300);
    it('Should start properly', done => {
      const sink = new JetSink(SINK_CONFIG);
      //@ts-expect-error - Test private method
      const providerStartMock = jest.spyOn(sink.provider, 'start').mockResolvedValue();
      sink.start().then(() => {
        expect(providerStartMock).toHaveBeenCalledTimes(1);
        done();
      });
    }, 300);
    it('Should stop properly', done => {
      const sink = new JetSink(SINK_CONFIG);
      //@ts-expect-error - Test private method
      const providerStopMock = jest.spyOn(sink.provider, 'stop').mockResolvedValue();
      sink.stop().then(() => {
        expect(providerStopMock).toHaveBeenCalledTimes(1);
        done();
      });
    }, 300);
    it('Should close properly', done => {
      const sink = new JetSink(SINK_CONFIG);
      //@ts-expect-error - Test private method
      const providerCloseMock = jest.spyOn(sink.provider, 'close').mockResolvedValue();
      sink.close().then(() => {
        expect(providerCloseMock).toHaveBeenCalledTimes(1);
        done();
      });
    }, 300);
    it('Should get checks properly', () => {
      const sink = new JetSink(SINK_CONFIG);
      const checksMock = {
        ['kafka-provider:test']: [{ componentId: 'componenetTest', status: 'pass' }],
      };
      //@ts-expect-error - Test private method
      jest.spyOn(sink.provider, 'checks', 'get').mockReturnValue(checksMock);
      expect(sink.checks).toEqual(checksMock);
    }, 300);
    it('Should get status properly', () => {
      const sink = new JetSink(SINK_CONFIG);
      //@ts-expect-error - Test private method
      jest.spyOn(sink.provider, 'status', 'get').mockReturnValue('pass');
      expect(sink.status).toEqual('pass');
    }, 300);
    it('Should perform single/multi operation properly', async () => {
      const sink = new JetSink(SINK_CONFIG);
      //@ts-expect-error - Mocking private method
      const repository = sink.repository;
      //@ts-expect-error - Mocking private method
      jest.spyOn(repository.provider, 'state', 'get').mockReturnValue('running');
      const send = jest
        //@ts-expect-error - Mocking private method
        .spyOn(sink.provider.client, 'send')
        .mockResolvedValue(resultWithoutErrors);
      const sendBatch = jest
        //@ts-expect-error - Mocking private method
        .spyOn(sink.provider.client, 'sendBatch')
        .mockResolvedValue(resultWithoutErrors);
      await sink.single(job1);
      await sink.multi([job1, job2, job3]);
      expect(send).toHaveBeenCalled();
      expect(send.mock.calls[0][0]).toEqual({
        acks: -1,
        compression: 0,
        messages: [{ value: JSON.stringify(job1.data) }],
        timeout: 5000,
        topic: 'Level_3_5.Energia.Medida.EDGE_Montcada.PLC10CLX',
      });
      expect(sendBatch).toHaveBeenCalled();
      expect(sendBatch.mock.calls[0][0]).toEqual({
        acks: -1,
        compression: 0,
        timeout: 5000,
        topicMessages: [
          {
            messages: [{ value: JSON.stringify(job1.data) }, { value: JSON.stringify(job2.data) }],
            topic: 'Level_3_5.Energia.Medida.EDGE_Montcada.PLC10CLX',
          },
          {
            messages: [{ value: JSON.stringify(job3.data) }],
            topic: 'Level_3_5.Otras_Variables.Medida.EDGE_Montcada.PLC10CLX',
          },
        ],
      });
    });
  });
  describe('#Sad path', () => {
    it('Should rejects single/multi operation if provider is not ready', async () => {
      const sink = new JetSink(SINK_CONFIG);
      //@ts-expect-error - Mocking private method
      const repository = sink.repository;
      //@ts-expect-error - Mocking private method
      await expect(repository.send({})).rejects.toThrow('The provider is not ready in this moment');
      //@ts-expect-error - Mocking private method
      await expect(repository.bulkSend({})).rejects.toThrow(
        'The provider is not ready in this moment'
      );
    });
    it('Should rejects single operation if send rejects', async () => {
      const jetSink = new JetSink(SINK_CONFIG);
      expect(jetSink).toBeDefined();
      //@ts-expect-error - Mocking private method
      jest.spyOn(jetSink.provider, 'state', 'get').mockReturnValue('running');
      jest
        //@ts-expect-error - Mocking private method
        .spyOn(jetSink.provider.client, 'send')
        .mockRejectedValue(new Error('myError'));
      try {
        await jetSink.single(job1);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Crash).message).toEqual('Error sending a job: myError');
        expect((error as Crash).cause?.message).toEqual('myError');
      }
    });
    it('Should rejects multi operation if sendBatch rejects', async () => {
      const jetSink = new JetSink(SINK_CONFIG);
      expect(jetSink).toBeDefined();
      //@ts-expect-error - Mocking private method
      jest.spyOn(jetSink.provider, 'state', 'get').mockReturnValue('running');
      jest
        //@ts-expect-error - Mocking private method
        .spyOn(jetSink.provider.client, 'sendBatch')
        .mockRejectedValue(new Error('myError'));
      try {
        await jetSink.multi([job1, job2, job3]);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Crash).message).toEqual('Error streaming jobs: myError');
        expect((error as Crash).cause?.message).toEqual('myError');
      }
    });
    it('Should rejects multi operation if sendBatch returns some errors', async () => {
      const jetSink = new JetSink(SINK_CONFIG);
      expect(jetSink).toBeDefined();
      //@ts-expect-error - Mocking private method
      jest.spyOn(jetSink.provider, 'state', 'get').mockReturnValue('running');
      jest
        //@ts-expect-error - Mocking private method
        .spyOn(jetSink.provider.client, 'sendBatch')
        .mockResolvedValue(resultWithErrors);
      try {
        await jetSink.multi([job1, job2, job3]);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Crash).message).toEqual(
          'Error streaming jobs: Some data showed some errors'
        );
        const cause = (error as Crash).cause as Multi;
        expect(cause.message).toEqual('Some data showed some errors');
        const firstCause = (cause.causes as Crash[])[0];
        expect(firstCause.message).toEqual('Error in topic d in partition 0: 500');
        expect(firstCause.info).toEqual({
          error: 500,
          date: undefined,
          subject: undefined,
          topic: 'd',
          partition: 0,
        });
      }
    });
  });
});
