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
process.env.CONFIG_KAFKA_TOPICS = 'Level_3.Hidraulicas;Level_3.Pluviometria';

import { Crash } from '@mdf.js/crash';
import type { EachMessagePayload } from 'kafkajs';
import { JobData, SourceOptions } from '../../types';
import { FlowSource } from './FlowSource';

const SOURCE_CONFIG: SourceOptions = {
  name: 'kafka-source-test',
  topics: ['Level_3.Calidad', 'Level_3.Energia'],
};
const jobBase = {
  routing: {
    topic: 'Level_3.Energia',
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
function pause(): () => void {
  return () => {
    return;
  };
}
function getMessagePayload(data: string, topic: string): EachMessagePayload {
  return {
    message: {
      //@ts-expect-error - Test process
      value: data ? Buffer.from(data) : undefined,
      timestamp: Date.now().toLocaleString(),
      key: Buffer.from(''),
      offset: '0',
      size: 0,
      attributes: 0,
    },
    partition: 0,
    topic,
    heartbeat: () => Promise.resolve(),
    pause,
  };
}
describe('#FlowSource #Kafka', () => {
  describe('#Happy path', () => {
    it('Should create a new valid instance of the FlowSource class with configuration object', () => {
      const source = new FlowSource(SOURCE_CONFIG);
      expect(source).toBeDefined();
      expect(source.name).toEqual('kafka-source-test');
      // @ts-expect-error - Test private property
      expect(source.topics).toEqual(['Level_3.Calidad', 'Level_3.Energia']);
    }, 300);
    it('Should create a new valid instance of the FlowSource class with environment variables', () => {
      const source1 = new FlowSource({ useEnvironment: true });
      const source2 = new FlowSource({ useEnvironment: false });
      expect(source1).toBeDefined();
      expect(source2).toBeDefined();
      expect(source1.name).toEqual('kafka-source');
      expect(source2.name).toEqual('kafka-source');
      // @ts-expect-error - Test private property
      expect(source1.topics).toEqual(['Level_3.Hidraulicas', 'Level_3.Pluviometria']);
      // @ts-expect-error - Test private property
      expect(source2.topics).toEqual([]);
    }, 300);
    it('Should start properly', done => {
      const source = new FlowSource(SOURCE_CONFIG);
      //@ts-expect-error - Test private method
      const providerStartMock = jest.spyOn(source.provider, 'start').mockResolvedValue();
      source.start().then(() => {
        expect(providerStartMock).toHaveBeenCalledTimes(1);
        done();
      });
    }, 300);
    it('Should stop properly', done => {
      const source = new FlowSource(SOURCE_CONFIG);
      //@ts-expect-error - Test private method
      const providerStopMock = jest.spyOn(source.provider, 'stop').mockResolvedValue();
      source.stop().then(() => {
        expect(providerStopMock).toHaveBeenCalledTimes(1);
        done();
      });
    }, 300);
    it('Should close properly', done => {
      const source = new FlowSource(SOURCE_CONFIG);
      //@ts-expect-error - Test private method
      const providerCloseMock = jest.spyOn(source.provider, 'close').mockResolvedValue();
      source.close().then(() => {
        expect(providerCloseMock).toHaveBeenCalledTimes(1);
        done();
      });
    }, 300);
    it('Should get checks properly', () => {
      const source = new FlowSource(SOURCE_CONFIG);
      const checksMock = {
        ['kafka-provider:test']: [{ componentId: 'componenetTest', status: 'pass' }],
      };
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'checks', 'get').mockReturnValue(checksMock);
      expect(source.checks).toEqual(checksMock);
    }, 300);
    it('Should get status properly', () => {
      const source = new FlowSource(SOURCE_CONFIG);
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'status', 'get').mockReturnValue('pass');
      expect(source.status).toEqual('pass');
    }, 300);
    it(`Should perform a complete ingestion and post consumer properly`, done => {
      const source = new FlowSource(SOURCE_CONFIG);
      let injectData: (payload: EachMessagePayload) => Promise<void> = () => {
        return Promise.resolve();
      };
      function myRunFake(options: {
        eachMessage: (payload: EachMessagePayload) => Promise<void>;
      }): Promise<void> {
        injectData = options.eachMessage;
        return Promise.resolve();
      }
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      const subscribe = jest.spyOn(source.provider.client, 'subscribe').mockResolvedValue();
      //@ts-expect-error - Test private method
      const run = jest.spyOn(source.provider.client, 'run').mockImplementation(myRunFake);
      //@ts-expect-error - Test private method
      const otherPause = jest.spyOn(source.provider.client, 'pause').mockResolvedValue();
      //@ts-expect-error - Test private method
      const commitOffsets = jest.spyOn(source.provider.client, 'commitOffsets').mockResolvedValue();
      source.on('data', async job => {
        expect(job).toBeDefined();
        expect(job.jobUserId).toEqual(`0*0*Level_3.Energia`);
        expect(job.data).toEqual(jobData);
        expect(job.type).toEqual('Medida');
        expect(job.options?.headers).toEqual(jobHeaders);
        await source.postConsume(job.jobUserId);
        expect(subscribe).toHaveBeenCalled();
        expect(subscribe.mock.calls[0][0]).toEqual({
          topics: ['Level_3.Calidad', 'Level_3.Energia'],
          fromBeginning: true,
        });
        expect(run).toHaveBeenCalled();
        expect(run.mock.calls[0][0]).toEqual({
          autoCommit: false,
          // @ts-expect-error - Test private method
          eachMessage: source.eachMessage,
        });
        expect(commitOffsets).toHaveBeenCalled();
        expect(commitOffsets.mock.calls[0][0]).toEqual([
          { topic: 'Level_3.Energia', partition: 0, offset: '1' },
        ]);
        source.removeAllListeners();
        //@ts-expect-error - Test private method
        source.provider.removeAllListeners();
        source.pause();
        expect(otherPause).toHaveBeenCalled();
        expect(otherPause.mock.calls[0][0]).toEqual([
          { topic: 'Level_3.Calidad' },
          { topic: 'Level_3.Energia' },
        ]);
        done();
      });
      //@ts-expect-error - Test private method
      source.provider.emit('status', 'running');
      source.init();
      process.nextTick(() => {
        injectData(getMessagePayload(JSON.stringify(jobData), 'Level_3.Energia'));
      });
    }, 300);
    it(`Should manage the init/pause method properly`, done => {
      const source = new FlowSource(SOURCE_CONFIG);
      //@ts-expect-error - Test private method
      expect(source.subscriptionPaused).toBeFalsy();
      //@ts-expect-error - Test private method
      expect(source.subscriptionDone).toBeFalsy();
      //@ts-expect-error - Test private method
      expect(source.subscriptionDoing).toBeFalsy();
      source.init();
      //@ts-expect-error - Test private method
      expect(source.subscriptionPaused).toBeFalsy();
      //@ts-expect-error - Test private method
      expect(source.subscriptionDone).toBeFalsy();
      //@ts-expect-error - Test private method
      expect(source.subscriptionDoing).toBeFalsy();
      source.pause();
      //@ts-expect-error - Test private method
      expect(source.subscriptionPaused).toBeFalsy();
      //@ts-expect-error - Test private method
      expect(source.subscriptionDone).toBeFalsy();
      //@ts-expect-error - Test private method
      expect(source.subscriptionDoing).toBeFalsy();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'subscribe').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'run').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'pause').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'resume').mockResolvedValue();
      source.on('data', () => jest.fn());
      source.init();
      process.nextTick(() => {
        //@ts-expect-error - Test private method
        expect(source.subscriptionPaused).toBeFalsy();
        //@ts-expect-error - Test private method
        expect(source.subscriptionDone).toBeTruthy();
        //@ts-expect-error - Test private method
        expect(source.subscriptionDoing).toBeFalsy();
        source.pause();
        //@ts-expect-error - Test private method
        expect(source.subscriptionPaused).toBeTruthy();
        //@ts-expect-error - Test private method
        expect(source.subscriptionDone).toBeTruthy();
        //@ts-expect-error - Test private method
        expect(source.subscriptionDoing).toBeFalsy();
        source.init();
        //@ts-expect-error - Test private method
        expect(source.subscriptionPaused).toBeFalsy();
        //@ts-expect-error - Test private method
        expect(source.subscriptionDone).toBeTruthy();
        //@ts-expect-error - Test private method
        expect(source.subscriptionDoing).toBeFalsy();
        done();
      });
    }, 300);
  });
  describe('#Sad path', () => {
    it(`Should emit an error if there is a problem on "resume" method`, done => {
      const source = new FlowSource(SOURCE_CONFIG);
      source.on('error', err => {
        expect(err).toBeInstanceOf(Crash);
        expect(err.message).toEqual('Error while resuming the consumer: Test error');
        expect((err as Crash).cause).toBeInstanceOf(Error);
        expect((err as Crash).cause?.message).toEqual('Test error');
        done();
      });
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'subscribe').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'run').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'pause').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'resume').mockImplementation(() => {
        throw new Error('Test error');
      });
      source.on('data', () => jest.fn());
      source.init();
      process.nextTick(() => {
        source.pause();
        source.init();
      });
    }, 300);
    it(`Should emit an error if there is a problem on "pause" method`, done => {
      const source = new FlowSource(SOURCE_CONFIG);
      source.on('error', err => {
        expect(err).toBeInstanceOf(Crash);
        expect(err.message).toEqual('Error while pausing the consumer: Test error');
        expect((err as Crash).cause).toBeInstanceOf(Error);
        expect((err as Crash).cause?.message).toEqual('Test error');
        done();
      });
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'subscribe').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'run').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'pause').mockImplementation(() => {
        throw new Error('Test error');
      });
      source.on('data', () => jest.fn());
      source.init();
      process.nextTick(() => {
        source.pause();
      });
    }, 300);
    it(`Should emit an error if there is a problem on "subscribe" method`, done => {
      const source = new FlowSource(SOURCE_CONFIG);
      source.on('error', err => {
        expect(err).toBeInstanceOf(Crash);
        expect(err.message).toEqual('Error while subscribing the consumer: Test error');
        expect((err as Crash).cause).toBeInstanceOf(Error);
        expect((err as Crash).cause?.message).toEqual('Test error');
        done();
      });
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'subscribe').mockRejectedValue(new Error('Test error'));
      source.on('data', () => jest.fn());
      source.init();
    }, 300);
    it('Should reject if there is a problem on "commitOffsets" method', done => {
      const source = new FlowSource(SOURCE_CONFIG);
      jest
        //@ts-expect-error - Test private method
        .spyOn(source.provider.client, 'commitOffsets')
        .mockRejectedValue(new Error('Test error'));
      source
        .postConsume('0*0*0')
        .then(() => {
          done(new Error('Should not be here'));
        })
        .catch(err => {
          expect(err).toBeInstanceOf(Crash);
          expect(err.message).toEqual('Error while committing offset: Test error');
          expect((err as Crash).cause).toBeInstanceOf(Error);
          expect((err as Crash).cause?.message).toEqual('Test error');
          done();
        });
    }, 300);
    it('Should emit an error if the message comes from a not supported topic', done => {
      const source = new FlowSource(SOURCE_CONFIG);
      let injectData: (payload: EachMessagePayload) => Promise<void> = () => {
        return Promise.resolve();
      };
      function myRunFake(options: {
        eachMessage: (payload: EachMessagePayload) => Promise<void>;
      }): Promise<void> {
        injectData = options.eachMessage;
        return Promise.resolve();
      }
      source.on('error', err => {
        expect(err).toBeInstanceOf(Crash);
        expect(err.message).toEqual('Error while handling the message');
        expect((err as Crash).cause).toBeInstanceOf(Crash);
        expect((err as Crash).cause?.message).toEqual(
          'A message from other topic [other.Energia] has been received, this is because the groupId has been reused'
        );
        done();
      });
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'subscribe').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'run').mockImplementation(myRunFake);
      source.on('data', () => jest.fn());
      source.init();
      process.nextTick(() => {
        injectData(getMessagePayload(JSON.stringify(jobData), 'other.Energia')).catch(err => {
          expect(err).toBeInstanceOf(Crash);
          expect((err as Crash).message).toEqual('Error while handling the message');
          expect((err as Crash).cause).toBeInstanceOf(Crash);
          expect((err as Crash).cause?.message).toEqual(
            'A message from other topic [other.Energia] has been received, this is because the groupId has been reused'
          );
        });
      });
    }, 300);
    it('Should emit an error if the message is empty', done => {
      const source = new FlowSource(SOURCE_CONFIG);
      let injectData: (payload: EachMessagePayload) => Promise<void> = () => {
        return Promise.resolve();
      };
      function myRunFake(options: {
        eachMessage: (payload: EachMessagePayload) => Promise<void>;
      }): Promise<void> {
        injectData = options.eachMessage;
        return Promise.resolve();
      }
      source.on('error', err => {
        expect(err).toBeInstanceOf(Crash);
        expect((err as Crash).message).toEqual('Error while handling the message');
        expect((err as Crash).cause).toBeInstanceOf(Crash);
        expect((err as Crash).cause?.message).toEqual(
          'No value in the Kafka message, it looks like an empty message'
        );
        done();
      });
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'subscribe').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'run').mockImplementation(myRunFake);
      source.on('data', () => jest.fn());
      source.init();
      process.nextTick(() => {
        //@ts-expect-error - Test process
        injectData(getMessagePayload(undefined, 'Level_3.Energia')).catch(err => {
          expect(err).toBeInstanceOf(Crash);
          expect((err as Crash).message).toEqual('Error while handling the message');
          expect((err as Crash).cause).toBeInstanceOf(Crash);
          expect((err as Crash).cause?.message).toEqual(
            'No value in the Kafka message, it looks like an empty message'
          );
        });
      });
    }, 300);
    it('Should emit an error if the message is malformed', done => {
      const source = new FlowSource(SOURCE_CONFIG);
      let injectData: (payload: EachMessagePayload) => Promise<void> = () => {
        return Promise.resolve();
      };
      function myRunFake(options: {
        eachMessage: (payload: EachMessagePayload) => Promise<void>;
      }): Promise<void> {
        injectData = options.eachMessage;
        return Promise.resolve();
      }
      source.on('error', err => {
        expect(err).toBeInstanceOf(Crash);
        expect((err as Crash).message).toEqual('Error while handling the message');
        expect((err as Crash).cause).toBeInstanceOf(Crash);
        expect((err as Crash).cause?.message).toContain(
          'Error parsing the kafka message to plain JSON object: Expected property name or'
        );
        source.removeAllListeners('error');
        done();
      });
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider, 'state', 'get').mockReturnValue('running');
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'subscribe').mockResolvedValue();
      //@ts-expect-error - Test private method
      jest.spyOn(source.provider.client, 'run').mockImplementation(myRunFake);
      source.on('data', () => jest.fn());
      source.init();
      process.nextTick(() => {
        injectData(getMessagePayload('{', 'Level_3.Energia')).catch(err => {
          expect(err).toBeInstanceOf(Crash);
          expect((err as Crash).message).toEqual('Error while handling the message');
          expect((err as Crash).cause).toBeInstanceOf(Crash);
          expect((err as Crash).cause?.message).toContain(
            'Error parsing the kafka message to plain JSON object: Expected property name or'
          );
        });
      });
    }, 10000);
  });
});
