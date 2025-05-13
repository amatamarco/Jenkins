pipeline {
    agent any

    environment {
        NODE_VERSION = '20.11.1'
        ARTIFACT_NAME = 'agbar-fh-kafka2kafka'
    }

    options {
        timestamps()
        skipDefaultCheckout()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Node.js and Yarn') {
            steps {
                script {
                    // Usa nvm o una imagen de Jenkins que ya tenga Node
                    sh '''
                    . $NVM_DIR/nvm.sh
                    nvm install ${NODE_VERSION}
                    nvm use ${NODE_VERSION}
                    node -v
                    yarn -v
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'yarn install'
            }
        }

        stage('Update Version Tags') {
            steps {
                script {
                    def version = "${env.BUILD_NUMBER}"
                    sh """
                    find artifacts -type f \\( -name 'package.json' -o -name 'artifact.dna' \\) -exec sed -i -E 's/\\"version\\": \\"[0-9]+\\.[0-9]+\\.[0-9]+\\"/\\"version\\": \\"${version}\\"/' {} +
                    """
                }
            }
        }

        stage('Build Artifact') {
            steps {
                sh 'yarn run build:production'
            }
        }

        stage('Install Production Dependencies') {
            steps {
                sh 'yarn install --production'
            }
        }

        stage('Prepare Artifacts') {
            matrix {
                axes {
                    axis {
                        name 'ENVIRONMENT'
                        values 'linux', 'windows'
                    }
                }
                stages {
                    stage('Copy node_modules') {
                        steps {
                            sh '''
                            mkdir -p artifacts/${ENVIRONMENT}/node_modules
                            cp -r node_modules/* artifacts/${ENVIRONMENT}/node_modules/
                            '''
                        }
                    }

                    stage('Archive Artifact') {
                        steps {
                            sh '''
                            mkdir -p ${ARTIFACT_NAME}
                            zip -r ${ARTIFACT_NAME}/${ARTIFACT_NAME}-${ENVIRONMENT}.zip artifacts/${ENVIRONMENT}
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
}
