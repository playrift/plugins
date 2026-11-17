
val engineVersion: String by rootProject.extra

tasks.named<ProcessResources>("processResources") {
    from("ui") { into("META-INF/rift/ts2") }
}

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    implementation("co.playrift:net-common:$engineVersion")
    implementation("co.playrift:cfg:$engineVersion")
    implementation("co.playrift:rift-project:$engineVersion")
}

tasks.register<JavaExec>("verifyDefaultSprites") {
    group = "verification"
    mainClass.set("co.playrift.default.sprites.scripts.VerifyDefaultSpritesKt")
    classpath = sourceSets["verify"].runtimeClasspath
}
