# Android 빌드 안내

## "restricted method in java.lang.System" 오류 (JDK 22+)

Android 빌드 시 `configureCMakeDebug` 단계에서 다음 오류가 나면:

```
Execution failed for task ':app:configureCMakeDebug[arm64-v8a]'.
> WARNING: A restricted method in java.lang.System has been called
```

JDK 22 이상에서 Gradle/CMake가 사용하는 네이티브 API가 제한되기 때문입니다.

### 해결 방법

**1) npm 스크립트로 실행 (JAVA_TOOL_OPTS 적용)**

```bash
cd android && ./gradlew --stop && cd ..
npm run android:no-packager
```

**2) 그래도 실패하면: JDK 17 또는 21 사용**

가장 확실한 방법은 JDK 17 또는 21로 빌드하는 것입니다.

- **macOS (Homebrew)**  
  JDK 17 설치: `brew install openjdk@17`  
  설치 후 `android/gradle.properties`에서 아래 주석을 해제하고 경로를 맞춥니다.

  ```properties
  org.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
  ```

  (Apple Silicon이면 `/opt/homebrew/`, Intel이면 `/usr/local/` 경로를 확인하세요.)

- **현재 사용 중인 Java 확인**

  ```bash
  java -version
  ```

  JDK 17/21이 이미 설치되어 있으면, `org.gradle.java.home`만 해당 JDK 경로로 설정하면 됩니다.

설정 후 Gradle 데몬을 한 번 끄고 다시 빌드합니다.

```bash
cd android && ./gradlew --stop && cd ..
npm run android:no-packager
```
