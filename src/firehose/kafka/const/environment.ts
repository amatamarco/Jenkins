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

import { coerce } from '@mdf.js/utils';

/** Kafka source topics to which subscribe */
export const CONFIG_KAFKA_TOPICS = process.env['CONFIG_KAFKA_TOPICS']
  ? process.env['CONFIG_KAFKA_TOPICS'].split(';')
  : [];

/**
 * Kafka sink topics namespace. It is the first section in Kafka topics names,
 * which have the following format: NAMESPACE.CATEGORY.MESSAGE_TYPE.ENITY[.ORIGIN]
 */
export const CONFIG_KAFKA_TOPIC_NAMESPACE = coerce(process.env['CONFIG_KAFKA_TOPIC_NAMESPACE'], '');
