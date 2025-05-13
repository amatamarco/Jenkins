pipeline {
    agent any

    environment {
        // Definir versión de Node.js si lo deseas
        NODE_VERSION = '16.x'
    }

    stages {
        stage('Checkout') {
            steps {
                // Obtener el código del repositorio
                git branch: 'main', url: 'https://github.com/tu-usuario/tu-repositorio.git'
            }
        }

        stage('Set Up Node and Yarn') {
            steps {
                script {
                    // Instalar Node.js usando el plugin de NodeJS
                    def nodeHome = tool name: 'NodeJS', type: 'NodeJSInstallation'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                    sh 'node -v'  // Verificar la versión de Node.js
                    sh 'npm install -g yarn'  // Instalar Yarn globalmente
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                // Instalar las dependencias con Yarn (o npm)
                sh 'yarn install'
            }
        }

        stage('Run Tests') {
            steps {
                // Ejecutar los tests (puedes cambiar esto dependiendo de tu configuración)
                sh 'yarn test'  // Cambiar por 'npm test' si usas npm
            }
        }

        stage('Archive Artifacts') {
            steps {
                // Archivar artefactos si es necesario (ej. logs o archivos generados)
                archiveArtifacts artifacts: '**/target/*.jar', allowEmptyArchive: true
            }
        }
    }

    post {
        success {
            // Notificar éxito
            echo '¡Los tests fueron exitosos!'
        }
        failure {
            // Notificar fallo
            echo 'Hubo un error en los tests'
        }
    }
}

