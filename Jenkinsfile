pipeline {
    agent { label 'linux' }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    environment {
        ARTIFACT_NAME = 'agbar-fh-kafka2kafka'
        NODE_VERSION = '20.11.1'
        DOCKER_REGISTRY = 'ghcr.io/mytracontrol'
        GITHUB_CREDENTIALS = credentials('github-credentials')
        DOCKER_CREDENTIALS = credentials('docker-registry-credentials')
    }

    stages {
        stage('Checkout & Init') {
            steps {
                checkout scm

                script {
                    def branch = env.GIT_BRANCH?.replace('origin/', '') ?: sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim()
                    env.BRANCH = branch
                    env.IS_BUILDABLE = ['main', 'master', 'develop'].any { branch == it } || branch.startsWith('release/') || branch.startsWith('hotfix/')
                    env.IMAGE_TAG = branch.startsWith('feature/') ? 'nightly' :
                                    branch.startsWith('release/') || branch.startsWith('hotfix/') ? 'beta' :
                                    branch == 'develop' ? 'alpha' :
                                    ['main', 'master'].contains(branch) ? 'latest' : 'test'
                }
            }
        }

        stage('Install & Test') {
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    sh 'npm install -g yarn'
                    sh 'yarn install'
                    sh 'yarn run test'
                    junit 'test-results.xml'
                    publishCoverage adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')]
                }
            }
        }

        stage('Build Artifact') {
            when { expression { env.IS_BUILDABLE == 'true' } }
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    sh 'yarn install'
                    sh "find ./artifacts -type f -name 'package.json' -o -name 'artifact.dna' -exec sed -i 's/\\(\\d\\+\\.\\d\\+\\.\\d\\+\\)/${env.BUILD_NUMBER}/g' {} +"
                    sh 'yarn run build:production'
                    sh 'yarn install --production'

                    ['linux', 'windows'].each { os ->
                        sh """
                            mkdir -p artifacts/${os}/node_modules
                            cp -r node_modules/* artifacts/${os}/node_modules/
                            mkdir -p ${ARTIFACT_NAME}
                            zip -r ${ARTIFACT_NAME}/${ARTIFACT_NAME}-${os}.zip artifacts/${os}
                        """
                    }

                    archiveArtifacts artifacts: "${ARTIFACT_NAME}/*.zip", fingerprint: true
                }
            }
        }

        stage('Docker Build & Push') {
            when { expression { env.IS_BUILDABLE == 'true' } }
            steps {
                sh "unzip -o '${ARTIFACT_NAME}/${ARTIFACT_NAME}-linux.zip' -d artifact"

                withCredentials([string(credentialsId: 'docker-registry-token', variable: 'DOCKER_TOKEN')]) {
                    sh "echo ${DOCKER_TOKEN} | docker login ghcr.io -u ${GITHUB_CREDENTIALS_USR} --password-stdin"
                    sh 'docker buildx create --use || true'

                    sh """
                        docker buildx build --push \
                          --tag ${DOCKER_REGISTRY}/${ARTIFACT_NAME}:${BUILD_NUMBER} \
                          --tag ${DOCKER_REGISTRY}/${ARTIFACT_NAME}:${IMAGE_TAG} \
                          --platform linux/amd64,linux/arm/v7,linux/arm64/v8 \
                          artifact
                        docker system prune -a --force || true
                    """
                }
            }
        }

        stage('Release Notes & GitHub Release') {
            when { expression { env.BRANCH in ['main', 'master'] } }
            steps {
                script {
                    def date = new Date().format("dd-MM-yyyy")
                    def notes = """## 🚀 ${BUILD_NUMBER} - ${date}\n\nAutomated release for ${ARTIFACT_NAME}"""

                    writeFile file: 'RELEASE.md', text: notes

                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        def repo = sh(script: 'git config --get remote.origin.url', returnStdout: true).trim()
                        def org = repo.tokenize('/')[-2]
                        def name = repo.tokenize('/')[-1].replace('.git', '')

                        sh """
                            git tag -a v${BUILD_NUMBER} -m 'Release ${BUILD_NUMBER}'
                            git push https://${GITHUB_CREDENTIALS_USR}:${GITHUB_TOKEN}@github.com/${org}/${name}.git v${BUILD_NUMBER}

                            if command -v gh &>/dev/null; then
                                echo ${GITHUB_TOKEN} | gh auth login --with-token
                                gh release create v${BUILD_NUMBER} --title "Release ${BUILD_NUMBER}" --notes-file RELEASE.md ${ARTIFACT_NAME}/*.zip
                            fi
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
            script {
                def status = currentBuild.result ?: 'SUCCESS'
                echo "Build finished with status: ${status}"
            }
        }
    }
}
