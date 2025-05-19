pipeline {
  agent {
    docker {
      image 'node:20.11.1'
      args '-u root'
    }
  }

  environment {
    GITHUB_CREDENTIALS = credentials('github-credentials')
    DOCKER_REGISTRY = 'ghcr.io'
    DOCKER_REPO = 'amatamarco/jenkins.git'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install dependencies') {
      steps {
        script {
          sh '''
            echo "Instalando yarn localmente..."
            npm install yarn
            echo "Instalando dependencias del proyecto con yarn local..."
            npx yarn install --frozen-lockfile
          '''
        }
      }
    }

    stage('Build') {
      steps {
        sh 'npx yarn build'
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
          sh "echo ${GITHUB_CREDENTIALS_PSW} | docker login ${DOCKER_REGISTRY} -u ${GITHUB_CREDENTIALS_USR} --password-stdin"
          sh 'docker buildx create --use || true'
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
