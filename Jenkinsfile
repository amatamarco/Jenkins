pipeline {
    agent {
        label 'linux'
    }

    environment {
        NODE_VERSION = '20.11.1'
        ARTIFACT_NAME = 'agbar-fh-kafka2kafka'
    }

    options {
        timestamps()
        ansiColor('xterm')
    }

    tools {
        nodejs "${env.NODE_VERSION}"
    }

    stages {

        stage('Checkout') {
            steps {
                cleanWs()
                checkout scm
                sh 'git fetch --unshallow || true'
            }
        }

        stage('Install Dependencies (dev)') {
            steps {
                sh 'yarn install'
            }
        }

        stage('Build Artifact') {
            steps {
                sh 'yarn run build:production'
            }
        }

        stage('Install Dependencies (production)') {
            steps {
                sh 'yarn install --production'
            }
        }

        stage('Prepare Artifacts') {
            matrix {
                axes {
                    axis {
                        name 'PLATFORM'
                        values 'linux', 'windows'
                    }
                }
                stages {
                    stage('Copy node_modules') {
                        steps {
                            sh '''
                            mkdir -p artifacts/${PLATFORM}/node_modules
                            cp -r node_modules/* artifacts/${PLATFORM}/node_modules/
                            '''
                        }
                    }

                    stage('Archive Artifact') {
                        steps {
                            sh '''
                            mkdir -p ${ARTIFACT_NAME}
                            zip -r ${ARTIFACT_NAME}/${ARTIFACT_NAME}-${PLATFORM}.zip artifacts/${PLATFORM}
                            '''
                        }
                    }
                }
            }
        }

        stage('Publish Artifacts') {
            steps {
                archiveArtifacts artifacts: "${ARTIFACT_NAME}/*.zip", fingerprint: true
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
    }
}
