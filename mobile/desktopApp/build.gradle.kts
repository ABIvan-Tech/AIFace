import org.jetbrains.compose.desktop.application.dsl.TargetFormat

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.jetbrainsCompose)
    alias(libs.plugins.compose.compiler)
}

kotlin {
    jvmToolchain(17)
    jvm()

    sourceSets {
        jvmMain.dependencies {
            implementation(projects.shared)
            implementation(compose.desktop.currentOs)
            implementation(project.dependencies.platform(libs.koin.bom))
            implementation(libs.koin.core)
        }
    }
}

compose.desktop {
    application {
        mainClass = "com.aiface.desktop.MainKt"

        nativeDistributions {
            packageName = "AIFace"
            packageVersion = "1.0.0"
            targetFormats(
                TargetFormat.Dmg,
                TargetFormat.Msi,
                TargetFormat.Deb,
            )

            macOS {
                iconFile.set(project.file("icons/icon.icns"))
            }

            linux {
                iconFile.set(project.file("icons/icon.png"))
            }

            windows {
                iconFile.set(project.file("icons/icon.ico"))
            }
        }
    }
}
