pipeline {
    agent any

    environment {
        NODE_VERSION = '24.0.1'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', credentialsId: 'github-credentials', url: 'https://github.com/amatamarco/Jenkins.git'
            }
        }

        stage('Set Up Node and Yarn') {
            steps {
                script {
                    def nodeHome = tool name: 'NodeJS', type: 'NodeJSInstallation'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                    sh 'node -v'
                    sh 'npm install -g yarn'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'yarn install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'yarn test'
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: '**/target/*.jar', allowEmptyArchive: true
            }
        }
    }

    post {
        success {
            echo '¡Los tests fueron exitosos!'
        }
        failure {
            echo 'Hubo un error en los tests'
        }
    }
}
