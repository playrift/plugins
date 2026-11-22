
val engineVersion: String by rootProject.extra

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    testRuntimeOnly(project(":skills"))
}

tasks.register<JavaExec>("verifyCutscenes") {
    group = "verification"
    mainClass.set("co.playrift.cutscenes.scripts.VerifyCutscenesKt")
    classpath = sourceSets["verify"].runtimeClasspath
}
