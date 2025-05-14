// import { Limiter, Single } from '@mdf.js/tasks';

// console.log('Executing test.ts');

// async function executeTestTask(): Promise<void> {
//   console.log(`[${new Date().toISOString()}] This is a test`);
//   return Promise.resolve();
// }

// const limiter = new Limiter({
//   concurrency: 1,
//   autoStart: false,
//   delay: 5000,
//   //   interval: 4000,
//   //   tokensPerInterval: 1,
// });
// limiter.on('done', (uuid: string, result: number, meta: any, error?: any) => {
//   console.log(`[${new Date().toISOString()}] Task ${uuid} done cb`, meta.status, result, error);
// });

// const testTask1 = new Single(executeTestTask, [], { id: 'task1' });
// const testTask2 = new Single(executeTestTask, [], { id: 'task2' });

// limiter.start();
// limiter.execute(testTask1).then(result => {
//   console.log(`[${new Date().toISOString()}] Task 1 done`, result);
// });

// limiter.execute(testTask2).then(result => {
//   console.log(`[${new Date().toISOString()}] Task 2 done`, result);
// });

// // limiter.schedule(testTask1);
// // limiter.schedule(testTask2);
