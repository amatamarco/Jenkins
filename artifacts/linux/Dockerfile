# Copyright 2021 Netin Systems S.L. All rights reserved.
# Note: All information contained herein is, and remains the property of Netin Systems S.L. and its
# suppliers, if any. The intellectual and technical concepts contained herein are property of
# Netin Systems S.L. and its suppliers and may be covered by European and Foreign patents, patents
# in process, and are protected by trade secret or copyright.
#
# Dissemination of this information or the reproduction of this material is strictly forbidden
# unless prior written permission is obtained from Netin Systems S.L.
FROM node:20.11.1-alpine3.19

#### Arguments
ARG BUILD_DATE='2021-08-21T12:24:00Z'

LABEL version="0.0.1-beta"
LABEL vendor="Netin Intelligence"

#### Labels
LABEL maintainer="support@netin.es"
LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.label-schema.name="Agbar Firehose Kafka to Kafka"
LABEL org.label-schema.description="Agbar Firehose Kafka to Kafka"
LABEL org.label-schema.url="https://www.netin.io"
LABEL org.label-schema.vendor="Netin Systems"

WORKDIR /usr/src/app

RUN mkdir /usr/src/app/logs

# This step is done when all the build has been done in CI (Azure Devops)
COPY . .
RUN adduser -D -s /bin/bash netin && chown -R netin /usr/src/app
USER netin

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl -f http://localhost:9080/v0/health || exit 1

EXPOSE 9080/tcp
EXPOSE 1883/tcp

ENTRYPOINT [ "node" ]
CMD ["/usr/src/app/dist/index.js"]