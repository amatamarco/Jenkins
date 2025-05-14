<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <div style="text-align:center;background-image:radial-gradient(circle farthest-corner at 50% 50%, #104c60, #0c0c13);">
    <img src="https://assets.website-files.com/626a3ef32d23835d9b2e4532/6290ab1e2d3e0d922913a6e3_digitalizacion_ENG.svg"alt="mytra"width="500">
  </div>
</p>

<h1 style="text-align:center;margin-bottom:0">Firehose - Kafka to Kafka</h1>
<h5 style="text-align:center;margin-top:0">Connection between Kafka broker and Kafka broker</h5>

<!-- markdownlint-enable MD033 -->
[![Known Vulnerabilities](https://snyk.io/package/npm/snyk/badge.svg)](https://snyk.io/package/npm/snyk)
[![Node Version](https://img.shields.io/static/v1?style=flat\&logo=node.js\&logoColor=green\&label=node\&message=%3E=20.2.0\&color=blue)](https://nodejs.org/dist/v20.11.1)


## Tabla de contenidos

- [Tabla de contenidos](#tabla-de-contenidos)
- [**Introduction**](#introduction)
- [**Information**](#information)
- [**Environment variables**](#environment-variables)
- [**Usage**](#usage)
- [**License**](#license)

## **Introduction**

The **Kafka2Kafka** firehose aims to consume data from a Kafka Broker and send it to another Kafka Broker. The type of data that this firehose processed is specific to the needs of the _IIOT Platform_ Project for _Aguas de Barcelona_.

## **Information**

The implementation is based on the [**@mdf.js/kafka-provider**](https://www.npmjs.com/package/@mdf.js/kafka-provider).

## **Environment variables**

- **CONFIG_KAFKA_TOPICS** (default: ` `): Kafka topics to which subscribe. It must be a single string that containn topics names separated by `';'`.

- **CONFIG\_FIREHOSE\_FILE** (default: `'/config/firehose.config.yaml'`): Path to the Firehose config file. This allows to set general configuration parameters such as Loger Options. An example is provided in the defaullt path.
- **CONFIG\_CUSTOM\_PRESET\_FIREHOSE\_FILE**: Path to the Firehose preset file. An example of configuration file is provided in the default path. **NOTE**: The `config` field inside `sink` and `source` corresponds to the configuration of the providers' clients, which can be checked in the [@mdf.js](https://github.com/mytracontrol/mdf.js?tab=readme-ov-file#mdfjs) repository. In the example, only some basic configuration is included in these fields, but they could be modified following the structure of providers' clients.

## **Usage**
To set up  and run this Node.js project, please follow the following steps:
1. **Pre-requirements**: It is required to have first installed [**Node**](https://nodejs.org/en/blog/release/v20.11.1) and [**Yarn**](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable). The Node version must be at least 20.11.1.
1. **Dependencies installation**: To install the required dependencies, execute **`yarn install`** in the project's root directory. This will create a folder named `node_modules` containing all the installed packages.
2. **Compilation**: Execute **`yarn compile`**. This will create a folder named `dist` conatining the Javascript compiled code.
3. **Configuration**: Set the required configuration in the environment variables and/or configuration files.
4. **Execution**: Execute **`node --trace-warnings -r dotenv/config ./dist/index.js`**. This will run the Firehose, which will start to consume data from the `source` broker as soon as there are data in it, in order to send this data to the `sink` broker.


## **License**

Copyright 2024 Mytra Control S.L. All rights reserved.
Note: All information contained herein is, and remains the property of Mytra Control S.L. and its suppliers, if any. The intellectual and technical concepts contained herein are property of Mytra Control S.L. and its suppliers and may be covered by European and Foreign patents, patents in process, and are protected by trade secret or copyright.

Dissemination of this information or the reproduction of this material is strictly forbidden unless prior written permission is obtained from Mytra Control S.L.
