pipeline {
  agent any

  tools {
    nodejs '20.11.1'     // Instalación de NodeJS en Jenkins
    git     'Default'    // Instalación de Git en Jenkins
  }

  environment {
    ARTIFACT_NAME   = 'agbar-fh-kafka2kafka'
    DOCKER_REGISTRY = 'ghcr.io/mytracontrol'
    IMAGE_NAME      = "${DOCKER_REGISTRY}/${ARTIFACT_NAME}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Versioning') {
      agent {
        docker {
          image 'mcr.microsoft.com/dotnet/sdk:6.0'
          args '-u root'
        }
      }
      steps {
        // Instalación y ejecución de GitVersion.Tool en un solo bloque
        sh '''
          dotnet tool install --global GitVersion.Tool --version 5.* \
            && export PATH="$HOME/.dotnet/tools:$PATH" \
            && dotnet-gitversion /config .config/GitVersion.yml /output json > version.json
        '''
        script {
          def v = readJSON file: 'version.json'
          env.VERSION = v.SemVer
          echo "Calculated version: ${VERSION}"
        }
      }
    }
      steps {
        // Instala GitVersion.Tool como herramienta global de .NET
        sh 'dotnet tool install --global GitVersion.Tool --version 5.*'
        // Añade las herramientas de .NET al PATH
        sh 'export PATH="$HOME/.dotnet/tools:$PATH"'
        // Ejecuta GitVersion usando el binario dotnet-gitversion
        sh 'dotnet-gitversion /config .config/GitVersion.yml /output json > version.json'
        script {
          def v = readJSON file: 'version.json'
          env.VERSION = v.SemVer
          echo "Calculated version: ${VERSION}"
        }
      }
    }

    stage('Install & Audit') {
      steps {
        sh 'yarn install --frozen-lockfile'
        sh 'node .config/thirdPartyCheck.js --files'
      }
    }

    stage('Build Artifact') {
      steps {
        sh 'yarn run build:production'
        sh 'yarn install --production'
      }
    }

    stage('Package Artifacts') {
      steps {
        script {
          ['linux','windows'].each { platform ->
            sh "mkdir -p artifacts/${platform}"
            sh "cp -R node_modules artifacts/${platform}/node_modules"
            sh "zip -r ${ARTIFACT_NAME}-${platform}.zip artifacts/${platform}"
            archiveArtifacts artifacts: "${ARTIFACT_NAME}-${platform}.zip", fingerprint: true
          }
        }
      }
    }

    stage('Mutation Tests') {
      steps {
        sh 'npx stryker run --config .config/stryker.config.js'
      }
    }

    stage('Generate Docs') {
      steps {
        sh 'npx typedoc --options .config/typedoc.json'
        archiveArtifacts artifacts: 'docs/**', fingerprint: true
      }
    }

    stage('Docker Build & Push') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo \"$DOCKER_PASS\" | docker login $DOCKER_REGISTRY -u $DOCKER_USER --password-stdin"
          sh 'docker buildx create --use'
          sh '''
            docker buildx build \
              --push \
              --tag ${IMAGE_NAME}:${VERSION} \
              --tag ${IMAGE_NAME}:latest \
              --platform linux/amd64,linux/arm/v7,linux/arm64/v8 \
              artifact
          '''
          sh 'docker system prune -a --force || true'
        }
      }
    }

    stage('Release Notes') {
      when { branch 'master' }
      steps {
        sh '''
          echo "## 🚀 Release ${VERSION} - $(date +%Y-%m-%d)" > RELEASE.md
          git log --pretty=format:"* %s" origin/master..HEAD >> RELEASE.md
        '''
        archiveArtifacts artifacts: 'RELEASE.md', fingerprint: true
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}
