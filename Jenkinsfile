pipeline {
    agent any

    //environment {
        // Puedes exportar la versión a una variable de entorno si lo necesitas
        // Por ejemplo: APP_VERSION = ''
    //}

    stages {
        stage('Versionado GitVersion') {
            steps {
                // Instala GitVersion como dotnet tool global (idempotente, no da error si ya está)
                sh 'dotnet tool install --global GitVersion.Tool || true'
                // Ejecuta GitVersion y exporta la versión como variable de entorno para el resto del pipeline
                sh '''
                    export PATH="$PATH:$HOME/.dotnet/tools"
                    VERSION_INFO=$(~/.dotnet/tools/gitversion /output json)
                    echo "$VERSION_INFO" > gitversion.json
                    VERSION=$(cat gitversion.json | jq -r .NuGetVersionV2)
                    echo "Versión detectada por GitVersion: $VERSION"
                    echo "APP_VERSION=$VERSION" >> $GITHUB_ENV || echo "APP_VERSION=$VERSION" > .jenkins_env
                '''
                // Imprime el contenido por consola para debug
                sh 'cat gitversion.json'
            }
        }

        stage('Mostrar contenido de .config') {
            steps {
                sh 'ls -lh .config'
            }
        }

        stage('Validar sintaxis YAML') {
            steps {
                sh '''
                    for f in .config/*.yml .config/*.yaml; do
                        if [ -f "$f" ]; then
                            echo "Validando $f"
                            npx yaml-lint "$f"
                        fi
                    done
                '''
            }
        }

        stage('Validar sintaxis JSON') {
            steps {
                sh '''
                    for f in .config/*.json; do
                        if [ -f "$f" ]; then
                            echo "Validando $f"
                            cat "$f" | python3 -m json.tool > /dev/null
                        fi
                    done
                '''
            }
        }

        stage('Validar sintaxis Markdown') {
            steps {
                sh '''
                    for f in .config/*.md; do
                        if [ -f "$f" ]; then
                            echo "Validando (sólo head) $f"
                            head -5 "$f"
                        fi
                    done
                '''
            }
        }

        stage('Instalar dependencias npm si existe package.json') {
            when {
                expression { fileExists('package.json') }
            }
            steps {
                sh 'npm install'
            }
        }

        stage('Generar documentación TypeDoc') {
            when {
                expression { fileExists('.config/typedoc.json') }
            }
            steps {
                sh '''
                    if [ -f .config/typedoc.json ]; then
                        echo "Generando documentación con TypeDoc"
                        npx typedoc --options .config/typedoc.json || echo "Fallo en TypeDoc"
                    fi
                '''
            }
        }

        stage('Ejecutar thirdPartyCheck.js') {
            when {
                expression { fileExists('.config/thirdPartyCheck.js') }
            }
            steps {
                sh '''
                    echo "Ejecutando thirdPartyCheck.js para análisis de dependencias"
                    node .config/thirdPartyCheck.js || echo "Error en thirdPartyCheck.js"
                '''
            }
        }

        stage('Simulación build de artifact (manual)') {
            steps {
                echo 'Si se quiere simular la build del artifact, se puede añadir aquí comandos npm/yarn, por ejemplo:'
                echo 'npm run build:production o yarn build:production'
                //sh 'npm run build:production' // Descomenta si tu proyecto lo soporta
            }
        }

        stage('Docker build (opcional)') {
            steps {
                echo 'Si hay un Dockerfile se puede construir la imagen aquí.'
                //sh 'docker build -t tuimagen:latest .'
            }
        }

        stage('Release Notes (Solo Azure DevOps)') {
            steps {
                echo 'La generación y push de release notes solo se puede hacer automáticamente en Azure DevOps.'
                echo 'En Jenkins sólo se podría simular, o dejar un placeholder.'
            }
        }
    }
}

