
val engineVersion: String by rootProject.extra

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    implementation("co.playrift:net-common:$engineVersion")
    implementation("co.playrift:cfg:$engineVersion")
    implementation("co.playrift:rift-project:$engineVersion")
    "verifyImplementation"("com.google.code.gson:gson:2.8.5")
    testRuntimeOnly(project(":skills"))
}

tasks.register<JavaExec>("verifyMusic") {
    group = "verification"
    mainClass.set("co.playrift.music.scripts.VerifyMusicKt")
    classpath = sourceSets["verify"].runtimeClasspath
    dependsOn(":musicShiftedFixture", ":musicNoneFixture")
    systemProperty("rift.verify.shiftedBundle", rootProject.file("fixtures/music-shifted/build/forge/server/bundle.json").path)
    systemProperty("rift.verify.noMusicBundle", rootProject.file("fixtures/music-none/build/forge/server/bundle.json").path)
}

tasks.register<JavaExec>("verifyMusicPlayer") {
    group = "verification"
    mainClass.set("co.playrift.music.scripts.VerifyMusicPlayerKt")
    classpath = sourceSets["verify"].runtimeClasspath
}

tasks.register<JavaExec>("verifyJingleMusic") {
    group = "verification"
    mainClass.set("co.playrift.music.scripts.VerifyJingleMusicKt")
    classpath = sourceSets["verify"].runtimeClasspath
}
