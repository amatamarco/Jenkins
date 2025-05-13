pipeline {
    agent any

    environment {
        ARTIFACT_NAME = 'agbar-fh-kafka2kafka'
        NODE_VERSION = '20.11.1'
        IMAGE_TAG = ''
    }

    parameters {
        string(name: 'artifactName', defaultValue: 'agbar-fh-kafka2kafka', description: 'Artifact Name')
        choice(name: 'environments', choices: ['linux', 'windows'], description: 'Artifact environments')
    }

    stages {
        stage('Install Node and Yarn') {
            steps {
                script {
                    // Install Node.js and Yarn
                    sh 'curl -sL https://deb.nodesource.com/setup_$NODE_VERSION.x | sudo -E bash -'
                    sh 'sudo apt-get install -y nodejs'
                    sh 'npm install -g yarn'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    // Install Node modules
                    sh 'yarn install --dev --registry useFeed --customFeed 54947cc7-1c0a-4d71-a742-0f2cf64772d8'
                }
            }
        }

        stage('Change Version in Files') {
            steps {
                script {
                    // Change version numbers in JSON files
                    sh 'yarn run version --versionNumber $BUILD_NUMBER'
                }
            }
        }

        stage('Build Artifact') {
            steps {
                script {
                    // Build the artifact from the source
                    sh 'yarn run build:production'
                }
            }
        }

        stage('Install Production Dependencies') {
            steps {
                script {
                    // Install production dependencies
                    sh 'yarn install --production --registry useFeed --customFeed 54947cc7-1c0a-4d71-a742-0f2cf64772d8'
                }
            }
        }

        stage('Deploy and Archive Artifacts') {
            matrix {
                axes {
                    axis {
                        name 'ENV'
                        values 'linux', 'windows'
                    }
                }
                stages {
                    stage('Copy Files') {
                        steps {
                            script {
                                sh "cp -r node_modules artifacts/${ENV}/node_modules"
                            }
                        }
                    }

                    stage('Archive Files') {
                        steps {
                            script {
                                sh "zip -r artifacts/${ENV}/${ARTIFACT_NAME}-${ENV}.zip artifacts/${ENV}"
                            }
                        }
                    }

                    stage('Publish Artifacts') {
                        steps {
                            script {
                                // Publish artifacts to container or artifact store
                                sh "publish-artifact --name ${ARTIFACT_NAME} --path artifacts/${ENV}"
                            }
                        }
                    }
                }
            }
        }

        stage('Docker Build and Push') {
            steps {
                script {
                    // Docker Build and Push Multi-platform
                    sh '''
                        docker buildx create --use
                        docker buildx build --push --tag ghcr.io/mytracontrol/${ARTIFACT_NAME}:${BUILD_NUMBER} --tag ghcr.io/mytracontrol/${ARTIFACT_NAME}:${IMAGE_TAG} --platform linux/amd64,linux/arm/v7,linux/arm64/v8 artifact
                    '''
                }
            }
        }

        stage('Clean Up') {
            steps {
                script {
                    // Clean Docker containers
                    sh 'docker system prune -a --force'
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully."
        }

        failure {
            echo "Pipeline failed."
        }
    }
}
