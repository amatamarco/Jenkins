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

export function start(firehose: Firehose, service: ServiceRegistry) {
  service.register(firehose);

  firehose.on('error', error => {
    service.logger.error(`Firehose error: ${error}`);
  });
  firehose.on('status', status => {
    service.logger.info(`Firehose status: ${status}`);
  });

  service
    .start()
    .then(() => {
      service.logger.info('App started');
    })
    .catch(reason => {
      service.logger.error(`An error has raised when starting my App, reason: ${reason}`);
    });
}
