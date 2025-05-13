pipeline {
    agent any

    environment {
        NODE_VERSION = '23.x' // Cambié la versión a 23.x según tu solicitud
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }

        stage('Install Node and Yarn') {
            steps {
                script {
                    // Instalar Node.js sin usar 'sudo'
                    sh '''
                    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} -o nodesource_setup.sh
                    bash nodesource_setup.sh
                    apt-get install -y nodejs
                    npm install -g yarn
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    // Instalar dependencias sin usar 'sudo'
                    sh 'npm install'
                }
            }
        }

        stage('Change Version in Files') {
            steps {
                script {
                    // Ejemplo de cambio de versión en archivos
                    sh 'sed -i "s/old-version/new-version/" file.txt'
                }
            }
        }

        stage('Build Artifact') {
            steps {
                script {
                    // Comando de construcción
                    sh 'npm run build'
                }
            }
        }

        stage('Install Production Dependencies') {
            steps {
                script {
                    // Instalar dependencias de producción
                    sh 'npm install --production'
                }
            }
        }

        stage('Deploy and Archive Artifacts') {
            steps {
                script {
                    // Desplegar y archivar los artefactos
                    sh 'npm run deploy'
                }
            }
        }

        stage('Docker Build and Push') {
            steps {
                script {
                    // Asegúrate de que Docker esté configurado adecuadamente en Jenkins
                    sh 'docker build -t my-app .'
                    sh 'docker push my-app'
                }
            }
        }

        stage('Clean Up') {
            steps {
                script {
                    // Limpiar recursos
                    sh 'rm -rf build/'
                }
            }
        }
    }

    post {
        always {
            // Acciones que se ejecutan siempre después de cada pipeline
            echo 'Cleaning up after pipeline run...'
        }
    }
}

