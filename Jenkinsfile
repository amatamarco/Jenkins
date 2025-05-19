pipeline {
  agent any

  environment {
    // Credenciales Jenkins con ID github-credentials, token de GitHub para autenticación
    GITHUB_CREDENTIALS = credentials('github-credentials')

    // Datos para docker login (por ejemplo, para GHCR)
    DOCKER_REGISTRY = 'ghcr.io'
    DOCKER_REPO = 'amatamarco/jenkins.git'
  }

  stages {
    stage('Install dependencies') {
      steps {
        script {
          // Instalamos Yarn solo si no está ya instalado
          sh '''
            if ! command -v yarn &> /dev/null; then
              echo "Yarn no encontrado, instalando..."
              npm install -g yarn
            else
              echo "Yarn ya está instalado"
            fi

            yarn install --frozen-lockfile
          '''
        }
      }
    }

    stage('Build') {
      steps {
        sh 'yarn build'
      }
    }

    stage('Get version') {
      steps {
        script {
          def version = sh(script: 'gitversion /output json /showvariable SemVer', returnStdout: true).trim()
          echo "Version: ${version}"
          env.APP_VERSION = version
        }
      }
    }

    stage('Docker Build and Push') {
      steps {
        script {
          // Login a Docker registry
          sh "echo ${GITHUB_CREDENTIALS_PSW} | docker login ${DOCKER_REGISTRY} -u ${GITHUB_CREDENTIALS_USR} --password-stdin"

          // Buildx builder create (opcional, solo si no existe)
          sh 'docker buildx create --use || true'

          // Construcción multiplataforma y push
          sh """
            docker buildx build \
              --platform linux/amd64,linux/arm64 \
              -t ${DOCKER_REGISTRY}/${DOCKER_REPO}:${env.APP_VERSION} \
              --push .
          """
        }
      }
    }

    stage('Generate Release Notes') {
      steps {
        sh 'git log -1 --pretty=format:"%h - %s" > release_notes.txt'
        archiveArtifacts artifacts: 'release_notes.txt', fingerprint: true
      }
    }
  }

  post {
    success {
      echo '✅ Pipeline completed successfully!'
    }
    failure {
      echo '❌ Pipeline failed.'
    }
  }
}
