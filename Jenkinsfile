pipeline {
  agent any

  tools {
    nodejs '20.11.1'     // Debes tener esta instalación en Manage Jenkins → Global Tool Configuration
    git     'Default'    // O el nombre que uses para tu instalación de Git
  }

  environment {
    ARTIFACT_NAME   = 'agbar-fh-kafka2kafka'
    DOCKER_REGISTRY = 'ghcr.io/mytracontrol'
    IMAGE_NAME      = "${DOCKER_REGISTRY}/${ARTIFACT_NAME}"
  }

  stages {
    stage('Checkout') {
      steps {
        // El propio pipeline tomará las credenciales de GitHub configuradas
        checkout scm
      }
    }

    stage('Versioning') {
      steps {
        // Lanza GitVersion con tu .config/GitVersion.yml
        sh 'gitversion /config .config/GitVersion.yml /output json > version.json'
        script {
          def v = readJSON file: 'version.json'
          env.VERSION = v.SemVer
          echo "Calculated version: ${VERSION}"
        }
      }
    }

    stage('Install & Audit') {
      steps {
        // Instalamos dev-deps y auditamos licencias
        sh 'yarn install --frozen-lockfile'
        sh 'node .config/thirdPartyCheck.js --files'
      }
    }

    stage('Build Artifact') {
      steps {
        // Compilamos en modo producción
        sh 'yarn run build:production'
        // Aseguramos solo deps de producción (igual que en azure-pipelines.artifact.yml)
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
        // Stryker según .config/stryker.config.js
        sh 'npx stryker run --config .config/stryker.config.js'
      }
    }

    stage('Generate Docs') {
      steps {
        // TypeDoc según .config/typedoc.json
        sh 'npx typedoc --options .config/typedoc.json'
        archiveArtifacts artifacts: 'docs/**', fingerprint: true
      }
    }

    stage('Docker Build & Push') {
      steps {
        // Usa tu credencial de Docker Hub
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo \$DOCKER_PASS | docker login \$DOCKER_REGISTRY -u \$DOCKER_USER --password-stdin"
          sh 'docker buildx create --use'
          sh """
            docker buildx build \\
              --push \\
              --tag ${IMAGE_NAME}:${VERSION} \\
              --tag ${IMAGE_NAME}:latest \\
              --platform linux/amd64,linux/arm/v7,linux/arm64/v8 \\
              artifact
          """
          // Limpieza de imágenes intermedias
          sh 'docker system prune -a --force || true'
        }
      }
    }

    stage('Release Notes') {
      when { branch 'master' }
      steps {
        // Genera un RELEASE.md básico
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
