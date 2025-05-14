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

/**
 * Auxiliary tool for Build process in Netin artifacts based in Nodejs.
 * This tool check the third party licenses and create and standard output format
 * This standard output format is included in the "artifacts" folder to be distributed together with them
 */
const licenseChecker = require('license-checker-rseidelsohn');
const fs = require('fs');
const config = require('../artifacts/linux/package.json');

const myFormat = {
  name: 'name',
  version: 'version',
  description: 'description not defined',
  repository: 'repository not defined',
  email: 'email not defined',
  url: 'url not defined',
  licenses: 'license:',
};

const DEFAULT_BUILT_CONFIG_ALLOWED_THIRD_PARTY_LICENSES =
  'MIT;Apache-2.0;Apache1.1;ISC;BSD-3-Clause;BSD-2-Clause;0BSD;Apache*;Python-2.0;BSD*;Unlicense;BlueOak-1.0.0;CC-BY-3.0;CC0-1.0';
const DEFAULT_BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES = true;

const BUILT_CONFIG_ALLOWED_THIRD_PARTY_LICENSES =
  process.env.BUILT_CONFIG_ALLOWED_THIRD_PARTY_LICENSES ||
  DEFAULT_BUILT_CONFIG_ALLOWED_THIRD_PARTY_LICENSES;

let BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES;
if (process.env.BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES) {
  if (process.env.BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES === 'true') {
    BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES = true;
  } else {
    BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES = false;
  }
} else {
  BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES =
    DEFAULT_BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES;
}

const BUILD_CONFIG_DEPENDENCIES_MD = './.config/DEPENDENCIES.md';

if (!fs.existsSync(BUILD_CONFIG_DEPENDENCIES_MD)) {
  console.error(
    `Wrong repository configuration, no DEPENDENCIES.md file found in ./.config folder`
  );
  process.exit(-1);
}

let artifactEnvironments = [];
if (fs.existsSync('./artifacts')) {
  artifactEnvironments = fs
    .readdirSync('./artifacts', { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `./artifacts/${entry.name}`);
}

function internalDependencies() {
  return new Promise((resolve, reject) => {
    licenseChecker.init(
      {
        start: './',
        production: BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES,
        customFormat: myFormat,
      },
      (error, dependencies) => {
        if (error) {
          console.log(error.message);
          process.exit(-1);
        }
        let mdToAppend = '\n## Dependencies\n\n';
        mdToAppend += '|**name**|**version**|\n|:-|:-|\n';
        for (const dependency of Object.values(dependencies)) {
          mdToAppend += `| ${dependency.name} | ${dependency.version} |\n`;
        }
        resolve(mdToAppend);
      }
    );
  });
}
function externalDependencies(markdown) {
  return new Promise((resolve, reject) => {
    licenseChecker.init(
      {
        start: './',
        production: BUILD_CONFIG_ONLY_PRODUCTION_THIRD_PARTY_LICENSES,
        onlyAllow: BUILT_CONFIG_ALLOWED_THIRD_PARTY_LICENSES,
        excludePackages: 'agbar-fh-kafka2kafka@0.1.0',
        customFormat: myFormat,
      },
      (error, dependencies) => {
        if (error) {
          console.log(error.message);
          process.exit(-1);
        }
        let mdToAppend = '\n## Third-party dependencies\n\n';
        mdToAppend += '|**name**|**version**|**license**|**url**|\n|:-|:-|:-|:-|\n';
        for (const dependency of Object.values(dependencies)) {
          mdToAppend += `| ${dependency.name} | ${dependency.version} | ${dependency.licenses} | ${dependency.repository} |\n`;
        }
        resolve(markdown + mdToAppend);
      }
    );
  });
}

internalDependencies()
  .then(result => externalDependencies(result))
  .then(result => {
    if (process.argv.length > 2 && process.argv[2] === '--files') {
      const resultMD = fs.readFileSync(BUILD_CONFIG_DEPENDENCIES_MD) + result;
      for (const environment of artifactEnvironments) {
        fs.writeFileSync(`${environment}/DEPENDENCIES.md`, resultMD, 'utf8');
      }
    }
  });
